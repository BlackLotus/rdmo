from __future__ import unicode_literals

from django.db import models
from django.utils.encoding import python_2_unicode_compatible
from django.utils.translation import ugettext_lazy as _

from mptt.models import MPTTModel, TreeForeignKey

from rdmo.core.utils import get_uri_prefix

from .validators import AttributeUniquePathValidator


@python_2_unicode_compatible
class Attribute(MPTTModel):

    uri = models.URLField(
        max_length=640, blank=True, null=True,
        verbose_name=_('URI'),
        help_text=_('The Uniform Resource Identifier of this attribute (auto-generated).')
    )
    uri_prefix = models.URLField(
        max_length=256, blank=True, null=True,
        verbose_name=_('URI Prefix'),
        help_text=_('The prefix for the URI of this attribute.')
    )
    key = models.SlugField(
        max_length=128, blank=True, null=True,
        verbose_name=_('Key'),
        help_text=_('The internal identifier of this attribute.')
    )
    path = models.CharField(
        max_length=512, db_index=True,
        verbose_name=_('Path'),
        help_text=_('The path part of the URI of this attribute (auto-generated).')
    )
    comment = models.TextField(
        blank=True, null=True,
        verbose_name=_('Comment'),
        help_text=_('Additional information about this attribute.')
    )
    parent = TreeForeignKey(
        'self', null=True, blank=True, related_name='children', db_index=True,
        verbose_name=_('Parent attribute'),
        help_text=_('Parent attribute in the domain model.')
    )

    class Meta:
        ordering = ('uri', )
        verbose_name = _('Attribute')
        verbose_name_plural = _('Attributes')
        permissions = (('view_attribute', 'Can view Attribute'),)

    def __str__(self):
        return self.uri or self.key

    def save(self, *args, **kwargs):
        self.path = Attribute.build_path(self.key, self.parent)
        self.uri = get_uri_prefix(self) + '/domain/' + self.path

        super(Attribute, self).save(*args, **kwargs)

        # recursively save children
        for child in self.children.all():
            child.save()

    def clean(self):
        self.path = Attribute.build_path(self.key, self.parent)
        AttributeUniquePathValidator(self)()

    @classmethod
    def build_path(self, key, parent):
        path = key
        while parent:
            path = parent.key + '/' + path
            parent = parent.parent
        return path
