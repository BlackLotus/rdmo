from __future__ import unicode_literals

from django.db import models

from django.utils.encoding import python_2_unicode_compatible
from django.utils.translation import ugettext_lazy as _
from django.template import Context, Template

from rdmo.core.utils import get_uri_prefix
from rdmo.core.models import TranslationMixin
from rdmo.conditions.models import Condition

from .validators import ViewUniqueKeyValidator


@python_2_unicode_compatible
class View(models.Model, TranslationMixin):

    uri = models.URLField(
        max_length=640, blank=True, null=True,
        verbose_name=_('URI'),
        help_text=_('The Uniform Resource Identifier of this view (auto-generated).')
    )
    uri_prefix = models.URLField(
        max_length=256, blank=True, null=True,
        verbose_name=_('URI Prefix'),
        help_text=_('The prefix for the URI of this view.')
    )
    key = models.SlugField(
        max_length=128, blank=True, null=True,
        verbose_name=_('Key'),
        help_text=_('The internal identifier of this view.')
    )
    comment = models.TextField(
        blank=True, null=True,
        verbose_name=_('Comment'),
        help_text=_('Additional internal information about this view.')
    )
    template = models.TextField(
        blank=True, null=True,
        verbose_name=_('Template'),
        help_text=_('The template for this view, written in Django template language.')
    )
    title_en = models.CharField(
        max_length=256, null=True, blank=True,
        verbose_name=_('Title (en)'),
        help_text=_('The English title for this view.')
    )
    title_de = models.CharField(
        max_length=256, null=True, blank=True,
        verbose_name=_('Title (de)'),
        help_text=_('The German title for this view.')
    )
    help_en = models.TextField(
        null=True, blank=True,
        verbose_name=_('Help (en)'),
        help_text=_('The English help text for this view.')
    )
    help_de = models.TextField(
        null=True, blank=True,
        verbose_name=_('Help (de)'),
        help_text=_('The German help text for this view.')
    )

    class Meta:
        ordering = ('key', )
        verbose_name = _('View')
        verbose_name_plural = _('Views')
        permissions = (('view_view', 'Can view View'),)

    def __str__(self):
        return self.uri or self.key

    def save(self, *args, **kwargs):
        self.uri = self.build_uri()
        super(View, self).save(*args, **kwargs)

    def clean(self):
        ViewUniqueKeyValidator(self).validate()

    @property
    def title(self):
        return self.trans('title')

    @property
    def help(self):
        return self.trans('help')

    def build_uri(self):
        return get_uri_prefix(self) + '/views/' + self.key

    def render(self, project, snapshot=None):
        # # get list of conditions
        conditions = {}
        for condition in Condition.objects.all():
            conditions[condition.key] = condition.resolve(project, snapshot)

        # get all values for this snapshot and put them in a dict labled by the values attibute path
        values = {}
        for value in project.values.filter(snapshot=snapshot):
            if value.attribute:
                attribute_path = value.attribute.path
                set_index = value.set_index

                # create entry for this values attribute in the values_dict
                if attribute_path not in values:
                    values[attribute_path] = []

                # add this value to the values
                try:
                    values[attribute_path][set_index].append(value)
                except IndexError:
                    values[attribute_path].append([value])

        # render the template to a html string
        return Template(self.template).render(Context({
            'conditions': conditions,
            'values': values
        }))
