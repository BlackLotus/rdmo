angular.module('project_questions')

.factory('QuestionsService', ['$resource', '$timeout', '$location', '$rootScope', '$filter', '$q', '$window', '$sce', function($resource, $timeout, $location, $rootScope, $filter, $q, $window, $sce) {

    /* get the base url */

    var baseurl = angular.element('meta[name="baseurl"]').attr('content');

    /* configure resources */

    var resources = {
        projects: $resource(baseurl + 'api/internal/projects/projects/:id/'),
        values: $resource(baseurl + 'api/internal/projects/values/:list_route/:id/'),
        catalogs: $resource(baseurl + 'api/internal/projects/catalogs/:id/'),
        questionsets: $resource(baseurl + 'api/internal/projects/questionsets/:list_route/:id/')
    };

    /* configure factories */

    var factories = {
        values: function(attribute_id) {
            return {
                text: '',
                option: null,
                project: service.project.id,
                attribute: attribute_id
            };
        },
        valuesets: function() {
            return {
                values: {}
            };
        }
    };

    /* create a buffer for the future service content */

    var future = {};

    /* create a flag to be used when clicking the prev button */

    var back = false;

    /* create a flag to be used when the view is initializing */

    var initializing = false;

    /* create the questions service */

    var service = {
        values: null
    };

    service.init = function(project_id) {

        resources.projects.get({id: project_id}, function(response) {
            service.project = response;

            // get the questionset and the catalog (for the overview)
            resources.catalogs.get({id: service.project.catalog}, function(response) {
                future.catalog = response;

                // get the current questionset_id form the url
                var questionset_id = $location.path().replace(/\//g,'');

                // init the view
                service.initView(questionset_id).then(function() {
                    service.catalog = angular.copy(future.catalog);

                    // enable back/forward button of browser
                    $rootScope.$on('$locationChangeSuccess', function (scope, next, current) {
                        var questionset_id = parseInt($location.path().replace(/\//g,''), 10);
                        if (questionset_id !== service.questionset.id) {
                            service.initView(questionset_id);
                        }
                    });
                });
            });
        });
    };

    service.initView = function(questionset_id) {

        if (initializing) return;

        if (questionset_id !== null) {

            // enable initializing flag
            initializing = true;

            return service.fetchQuestionSet(questionset_id)
            .then(function() {
                return service.checkConditions();
            })
            .then(function() {
                return service.initOptions();
            })
            .then(function() {
                return service.fetchValues();
            })
            .then(function () {
                // initialize values
                service.initValues();

                // copy questionset
                service.questionset = angular.copy(future.questionset);

                // copy valuesets
                service.valueset_list = angular.copy(future.valueset_list);
                service.valuesets = angular.copy(future.valuesets);

                // activate fist valueset
                if (service.valueset_list.length) {
                    service.activateValueSet(service.valueset_list[0])
                } else {
                    service.activateValueSet(null);
                }

                // focus the first field
                if (service.values) {
                    var first_question = service.questionset.questions[0];

                    if (first_question.widget_type != 'date') {
                        if (first_question.is_collection) {
                            service.focusField(first_question.attribute.id, 0);
                        } else {
                            service.focusField(first_question.attribute.id);
                        }
                    }
                }

                // disable initializing flag again
                initializing = false;

                // set browser location, scroll to top and set back flag
                $location.path('/' + service.questionset.id + '/');
                $window.scrollTo(0, 0);
                back = false;

            }, function (result) {
                if (result === false) {
                    // checkConditions returned $q.reject

                    // disable initializing flag again
                    initializing = false;

                    // navigate to another question questionset when checkConditions returned $q.reject
                    if (back) {
                        return service.initView(future.questionset.prev);
                    } else {
                        return service.initView(future.questionset.next);
                    }
                }
            });
        } else {
            service.questionset = {
                id: false,
                progress: 100,
                next: null,
                prev: service.questionset.id
            };

            // set browser location, scroll to top and set back flag
            // $location.path('/done/');
            $window.scrollTo(0, 0);
            back = false;
        }
    };

    service.fetchQuestionSet = function(questionset_id) {

        // fetch the current (or the first) question set from the server
        if (questionset_id) {
            future.questionset = resources.questionsets.get({id: questionset_id});
        } else {
            future.questionset = resources.questionsets.get({
                list_route: 'first',
                catalog: service.project.catalog
            });
        }

        // store the questionset and return the promise
        return future.questionset.$promise.then(function() {
            // mark the help text of the question set 'save'
            future.questionset.help = $sce.trustAsHtml(future.questionset.help);

            // mark help text safe
            angular.forEach(future.questionset.questions, function(question) {
                // mark the help text of the question 'save'
                question.help = $sce.trustAsHtml(question.help);
            });
        });
    };

    service.checkConditions = function() {
        if (future.questionset.conditions && future.questionset.conditions.length) {
            var results = [],
                promises = [];

            // fetch the values for these conditions from the server
            angular.forEach(future.questionset.conditions, function (condition) {
                promises.push(resources.values.get({
                    list_route: 'resolve',
                    condition: condition.id,
                    project: service.project.id,
                }, function(response) {
                    results.push(response.result);
                }).$promise);
            });

            return $q.all(promises).then(function() {
                if (results.length && results.indexOf(true) === -1) {
                    return $q.reject(false);
                } else {
                    return $q.when();
                }
            });
        } else {
            return $q.when();
        }
    };

    service.initOptions = function() {
        promises = [];

        angular.forEach(future.questionset.questions, function(question) {
            if (question.optionsets.length) {
                // init options array for this questions attribute
                question.options = [];

                angular.forEach(question.optionsets, function(optionset) {
                    // add options to the options array
                    question.options = question.options.concat(optionset.options);

                    // check for the condition of the optionset
                    if (optionset.conditions.length) {
                        // set all options of this optionset to hidden
                        angular.forEach(optionset.options, function(option) {
                            option.hidden = true;
                        });

                        angular.forEach(optionset.conditions, function (condition_id) {
                            promises.push(resources.values.get({
                                list_route: 'resolve',
                                condition: condition_id,
                                project: service.project.id,
                            }, function(response) {
                                if (response.result) {
                                    // un-hidden all options
                                    angular.forEach(optionset.options, function(option) {
                                        option.hidden = false;
                                    });
                                }
                            }).$promise);
                        });
                    }
                });
            }
        });

        return $q.all(promises);
    };

    service.fetchValues = function() {
        future.values = {};

        // init valuesets array
        future.valueset_list = [];
        future.valuesets = {};

        if (future.questionset.is_collection) {
            // fetch all values for the set from the server
            return resources.values.query({
                project: service.project.id,
                set_attribute: future.questionset.attribute.id
            }, function(response) {
                // important: the values in response need to be ordered by set_index and collection_index
                // loop over fetched values and sort them into valuesets
                angular.forEach(response, function(value) {
                    if (angular.isUndefined(future.valuesets[value.set_index])) {
                        future.valuesets[value.set_index] = factories.valuesets();
                        future.valueset_list.push(value.set_index);
                    }

                    if (angular.isDefined(future.valuesets[value.set_index].values[value.attribute])) {
                        future.valuesets[value.set_index].values[value.attribute].push(value);
                    } else {
                        future.valuesets[value.set_index].values[value.attribute] = [value];
                    }
                });
            }).$promise;

        } else {
            // create the (only) valueset
            future.valueset_list = [0];
            future.valuesets[0] = factories.valuesets();

            // fetch all values for the attributes in this set from the server
            var promises = [];
            angular.forEach(future.questionset.questions, function(question) {
                var attribute_id = question.attribute.id;

                promises.push(resources.values.query({
                    project: service.project.id,
                    attribute: attribute_id
                }, function(response) {
                    angular.forEach(response, function(value) {
                        if (angular.isDefined(future.valuesets[0].values[value.attribute])) {
                            future.valuesets[0].values[value.attribute].push(value);
                        } else {
                            future.valuesets[0].values[value.attribute] = [value];
                        }
                    });
                }).$promise);
            });

            return $q.all(promises);
        }
    };

    service.initValues = function() {
        // loop over valuesets and questions to init values and widgets
        angular.forEach(future.valuesets, function(valueset) {
            angular.forEach(future.questionset.questions, function(question) {
                var attribute_id = question.attribute.id;

                if (question.widget_type === 'checkbox') {
                    if (angular.isUndefined(valueset.values[attribute_id])) {
                        valueset.values[attribute_id] = [];
                    }
                    valueset.values[attribute_id] = service.initCheckbox(valueset.values[attribute_id], question);
                } else {
                    if (angular.isUndefined(valueset.values[attribute_id])) {
                        valueset.values[attribute_id] = [factories.values(attribute_id)];
                    }
                }

                angular.forEach(valueset.values[attribute_id], function(value) {
                    service.initWidget(question, value);
                });
            });
        });
    };

    service.initWidget = function(question, value) {

        if (question.widget_type === 'radio') {
            value.input = {};

            angular.forEach(question.options, function(option) {
                if (option.additional_input) {
                    if (value.option === option.id) {
                        value.input[option.id] = value.text;
                    } else {
                        value.input[option.id] = '';
                    }
                }
            });
        }

        if (question.widget_type === 'range') {
            if (!value.text) {
                value.text = '0';
            }
        }
    };

    service.initCheckbox = function(values, question) {
        var checkbox_values = [];

        angular.forEach(question.options, function(option) {
            var filter = $filter('filter')(values, function(value, index, array) {
                return value.option === option.id;
            });

            var value;
            if (filter.length === 1) {
                value = filter[0];
                value.removed = false;
            } else {
                value = factories.values(question.attribute.id);
                value.removed = true;
                value.option = option.id;
            }

            checkbox_values.push(value);
        });

        return checkbox_values;
    };

    service.focusField = function(attribute_id, index) {
        $timeout(function() {
            if (angular.isDefined(index)) {
                angular.element('#id_' + attribute_id.toString() + '_' + index.toString()).focus();
            } else {
                angular.element('#id_' + attribute_id.toString()).focus();
            }
        });
    };

    service.storeValue = function(value, question, collection_index, set_index) {

        if (angular.isDefined(value.removed) && value.removed) {
            // delete the value if it alredy exists on the server
            if (angular.isDefined(value.id)) {
                return resources.values.delete({
                    id: value.id,
                    project: service.project.id
                }).$promise;
            }
        } else {
            // store the current index in the list
            value.set_index = set_index;
            value.collection_index = collection_index;

            if (question === null) {
                // this is the id of a new valueset
                value.value_type = 'text';
                value.unit = '';
            } else {
                value.value_type = question.value_type;
                value.unit = question.unit;
            }

            if (angular.isDefined(value.id)) {
                // update an existing value
                return resources.values.update({
                    id: value.id,
                    project: service.project.id
                }, value, function(response) {
                    angular.extend(value, response);
                }).$promise;
            } else {
                // update a new value
                return resources.values.save({
                    project: service.project.id
                }, value, function(response) {
                    angular.extend(value, response);
                }).$promise;
            }
        }

    };

    service.storeValues = function() {
        var promises = [];

        angular.forEach(service.valueset_list, function(set_index) {
            angular.forEach(service.questionset.questions, function(question) {
                var attribute_id = question.attribute.id;
                var values = service.valuesets[set_index].values[attribute_id];

                angular.forEach(values, function(value, collection_index) {
                    promises.push(service.storeValue(value, question, collection_index, set_index));
                });
            });
        });

        return $q.all(promises);
    };

    service.prev = function() {
        if (service.questionset.prev !== null) {
            back = true;
            service.initView(service.questionset.prev);
        }
    };

    service.next = function() {
        if (service.questionset.id !== null) {
            service.initView(service.questionset.next);
        }
    };

    service.jump = function(section, questionset) {
        var next_questionset_id = null;

        if (angular.isUndefined(questionset)) {
            next_questionset_id = section.questionsets[0].id;
        } else {
            next_questionset_id = questionset.id;
        }

        if (next_questionset_id) {
            service.initView(next_questionset_id);
        }
    };

    service.save = function(proceed) {
        service.storeValues().then(function() {
            if (angular.isDefined(proceed) && proceed) {
                if (service.questionset.is_collection) {
                    if (service.valueset_list.length) {
                        // get the index of the current set_index in service.values_list
                        var index = service.valueset_list.indexOf(service.valueset_index);

                        if (index == service.valueset_list.length - 1) {
                            // it the last valueset, go to the next page
                            service.next();
                        } else {
                            // activate the next valueset
                            service.activateValueSet(service.valueset_list[index + 1]);
                            $window.scrollTo(0, 0);
                        }
                    } else {
                        service.next();
                    }
                } else {
                    service.next();
                }
            }
        });
    };

    service.addValue = function(question) {
        var value = factories.values(question.attribute.id);

        //  add new value to service.values
        if (angular.isUndefined(service.values[question.attribute.id])) {
            service.values[question.attribute.id] = [value];
        } else {
            service.values[question.attribute.id].push(value);
        }

        service.initWidget(question, value);

        // focus the new value
        service.focusField(question.attribute.id, service.values[question.attribute.id].length - 1);
    };

    service.eraseValue = function(attribute_id, index) {
        service.values[attribute_id][index].text = null;
        service.values[attribute_id][index].option = null;
    };

    service.removeValue = function(attribute_id, index) {
        service.values[attribute_id][index].removed = true;
    };

    service.openValueSetFormModal = function(create) {

        service.modal_values = {};
        service.modal_errors = {};

        if (angular.isDefined(create) && create) {
            // set the create flag on the modal_values
            service.modal_values.create = true;
        } else {
            // get the existing title if there is a value for that
            if (service.questionset.attribute.id_attribute) {
                if (angular.isDefined(service.values[service.questionset.attribute.id_attribute.id])) {
                    service.modal_values = angular.copy(service.values[service.questionset.attribute.id_attribute.id][0]);
                }
            }
        }

        if (service.questionset.attribute.id_attribute) {
            $timeout(function() {
                $('#valuesets-form-modal').modal('show');
            });
        } else {
            service.addValueSet();
        }
    };

    service.submitValueSetFormModal = function() {
        service.modal_errors = {};

        // va;idate that there is any title given
        if (service.questionset.attribute.id_attribute) {
            if (angular.isUndefined(service.modal_values.text) || !service.modal_values.text) {
                service.modal_errors.text = [];
                return;
            }
        }

        // create a new valueset if the create flag was set
        if (angular.isDefined(service.modal_values.create) && service.modal_values.create) {
            service.addValueSet(service.modal_values.text);
        } else {
            service.updateValueSet(service.modal_values.text);
        }

        $timeout(function() {
            $('#valuesets-form-modal').modal('hide');
        });
    };

    service.openValueSetDeleteModal = function() {
        $timeout(function() {
            $('#valuesets-delete-modal').modal('show');
        });
    };

    service.submitValueSetDeleteModal = function() {
        service.removeValueSet();
        $timeout(function() {
            $('#valuesets-delete-modal').modal('hide');
        });
    };

    service.addValueSet = function(text) {
        // get the last set_index and create the new one
        var set_index;
        if (service.valueset_list.length) {
            set_index = service.valueset_list[service.valueset_list.length - 1] + 1;
        } else {
            set_index = 0
        }

        // create a new valueset
        var valueset = factories.valuesets();

        // add values for the new valueset
        angular.forEach(service.questionset.questions, function(question, index) {
            var value = factories.values(question.attribute.id);

            valueset.values[question.attribute.id] = [value];
            service.storeValue(value, question, 0, set_index);
        });

        if (service.questionset.attribute.id_attribute) {
            var id_attribute_id = service.questionset.attribute.id_attribute.id;

            // create a value to hold the id of the valuset
            var value = {
                'project': service.project.id,
                'attribute': id_attribute_id,
                'text': text
            };

            valueset.values[id_attribute_id] = [value];
            service.storeValue(value, null, 0, set_index);
        }

        // append the new valueset to the array of valuesets
        service.valueset_list.push(set_index);
        service.valuesets[set_index] = valueset;

        // 'activate' the new valueset
        service.activateValueSet(set_index);
    };

    service.updateValueSet = function(text) {
        // get the current set_index
        var set_index = service.valueset_index;

        // get the id of the id_attribute of the questionset
        var id_attribute_id = service.questionset.attribute.id_attribute.id;

        // create a value to hold the id of the valuset if it does not exist yet
        if (angular.isUndefined(service.values[id_attribute_id])) {
            service.values[id_attribute_id] = [{
                'project': service.project.id,
                'attribute': id_attribute_id
            }];
        }

        // update the value holding the id of the valuset
        var value = service.values[service.questionset.attribute.id_attribute.id][0];
        value.text = text;

        // store the value on the server
        service.storeValue(value, null, 0, set_index);
    };

    service.removeValueSet = function() {
        // get the current set_index
        var set_index = service.valueset_index;

        // get the index in service.values_list
        var index = service.valueset_list.indexOf(set_index);

        // delete values on the server
        angular.forEach(service.values, function(values) {
            angular.forEach(values, function(value) {
                value.removed = true;
                service.storeValue(value, null, value.collection_index, set_index);
            });
        });

        // activate the valueset before the current one
        if (service.valueset_list.length == 1) {
            service.activateValueSet(null);
        } else if (index == 0) {
            service.activateValueSet(service.valueset_list[1]);
        } else {
            service.activateValueSet(service.valueset_list[index - 1]);
        }

        // delete the valueset
        service.valueset_list.splice(index, 1);
        delete service.valuesets[set_index];
    };

    service.activateValueSet = function(set_index) {
        if (set_index === null) {
            service.valueset_index = null;
            service.values = null;
        } else {
            service.valueset_index = set_index;
            service.values = service.valuesets[set_index].values;
        }
    };

    return service;

}]);
