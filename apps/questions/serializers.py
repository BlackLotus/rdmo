from django.conf import settings

from rest_framework import serializers
from rest_framework.reverse import reverse

from apps.domain.models import AttributeEntity, Attribute

from .models import *


class CatalogIndexSerializer(serializers.ModelSerializer):

    class Meta:
        model = Catalog
        fields = (
            'id',
            'label',
        )


class CatalogSerializer(serializers.ModelSerializer):

    class Meta:
        model = Catalog
        fields = (
            'id',
            'order',
            'title',
            'title_en',
            'title_de',
            'title'
        )


class SectionIndexSerializer(serializers.ModelSerializer):

    class Meta:
        model = Section
        fields = (
            'id',
            'label',
        )


class SectionSerializer(serializers.ModelSerializer):

    class Meta:
        model = Section
        fields = (
            'id',
            'catalog',
            'order',
            'title',
            'title_en',
            'title_de'
        )


class SubsectionIndexSerializer(serializers.ModelSerializer):

    class Meta:
        model = Subsection
        fields = (
            'id',
            'label',
        )


class SubsectionSerializer(serializers.ModelSerializer):

    class Meta:
        model = Subsection
        fields = (
            'id',
            'section',
            'order',
            'title',
            'title_en',
            'title_de',
        )


class QuestionSetIndexSerializer(serializers.ModelSerializer):

    class Meta:
        model = QuestionEntity
        fields = (
            'id',
            'label'
        )


class QuestionSetSerializer(serializers.ModelSerializer):

    class Meta:
        model = QuestionEntity
        fields = (
            'id',
            'subsection',
            'attribute_entity',
            'order',
            'help_en',
            'help_de',
        )


class QuestionSerializer(serializers.ModelSerializer):

    class Meta:
        model = Question
        fields = (
            'id',
            'subsection',
            'parent',
            'attribute_entity',
            'order',
            'help_en',
            'help_de',
            'text_en',
            'text_de',
            'widget_type',
        )


class AttributeEntitySerializer(serializers.ModelSerializer):

    class Meta:
        model = AttributeEntity
        fields = (
            'id',
            'label'
        )


class AttributeSerializer(serializers.ModelSerializer):

    class Meta:
        model = Attribute
        fields = (
            'id',
            'label'
        )


class CatalogAttributeEntityNestedSerializer(serializers.ModelSerializer):

    class Meta:
        model = AttributeEntity
        fields = (
            'id',
            'label',
        )


class CatalogQuestionNestedSerializer(serializers.ModelSerializer):

    attribute_entity = CatalogAttributeEntityNestedSerializer(read_only=True)

    class Meta:
        model = Question
        fields = (
            'id',
            'text',
            'attribute_entity'
        )


class CatalogQuestionEntityNestedSerializer(serializers.ModelSerializer):

    questions = CatalogQuestionNestedSerializer(many=True, read_only=True)
    text = serializers.CharField(source='question.text')

    attribute_entity = CatalogAttributeEntityNestedSerializer(read_only=True)

    class Meta:
        model = QuestionEntity
        fields = (
            'id',
            'subsection',
            'text',
            'is_set',
            'attribute_entity',
            'questions'
        )


class CatalogSubsectionNestedSerializer(serializers.ModelSerializer):

    entities = serializers.SerializerMethodField()

    class Meta:
        model = Subsection
        fields = (
            'id',
            'title',
            'entities'
        )

    def get_entities(self, obj):
        entities = QuestionEntity.objects.filter(subsection=obj, question__parent=None).order_by('order')
        serializer = CatalogQuestionEntityNestedSerializer(instance=entities, many=True)
        return serializer.data


class CatalogSectionNestedSerializer(serializers.ModelSerializer):

    subsections = CatalogSubsectionNestedSerializer(many=True, read_only=True)

    class Meta:
        model = Section
        fields = (
            'id',
            'title',
            'subsections'
        )


class CatalogNestedSerializer(serializers.ModelSerializer):

    sections = CatalogSectionNestedSerializer(many=True, read_only=True)

    urls = serializers.SerializerMethodField()

    class Meta:
        model = Catalog
        fields = (
            'id',
            'title',
            'title_en',
            'title_de',
            'sections',
            'urls'
        )

    def get_urls(self, obj):
        urls = {}
        for format in settings.EXPORT_FORMATS:
            urls[format] = reverse('questions_catalog_export', args=[obj.pk, format])
        return urls
