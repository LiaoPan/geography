
/* Controllers */
angular.module('proso.geography.controllers', [])

.controller('AppCtrl', ['$scope', '$rootScope', 'userService', 'pageTitle', 'configService',
    function($scope, $rootScope, userService, pageTitle, configService) {
        'use strict';
        $scope.configService = configService;
        $scope.userService = userService;

        $rootScope.initTitle = function (title) {
            $rootScope.initialTitle = title;
            $rootScope.title = title;
        };

        $rootScope.$on("$routeChangeStart", function(event, next) {
            $rootScope.title = pageTitle(next) + $rootScope.initialTitle;
        });

        $scope.initLanguageCode = function (code) {
            $rootScope.LANGUAGE_CODE = code;
        };

        $scope.initUser = function (data) {
            userService.processUser(data);
        };

        $scope.logout = function() {
            $rootScope.user = userService.logout();
        };

}])

.controller('AppView', ['$scope', '$routeParams', '$filter', 'flashcardService', 'mapTitle', 'placeTypeService',
    function($scope, $routeParams, $filter, flashcardService, mapTitle, placeTypeService) {
        'use strict';
        $scope.part = $routeParams.part;
        var user = $routeParams.user || '';
        $scope.typeCategories = flashcardService.getCategories($scope.part);

        var filter = {
            contexts : [$routeParams.part],
        };
        if ($routeParams.user == 'average') {
          filter.new_user_predictions = true;
        }

        flashcardService.getFlashcards(filter).then(function(data) {
            angular.forEach(data, function(flashcard) {
              if (filter.new_user_predictions) {
                flashcard.prediction = flashcard.new_user_prediction;
                flashcard.practiced = true;
              }
              flashcard.prediction = Math.ceil(flashcard.prediction * 10) / 10;
            });
            var placeTypes = placeTypeService.getTypes();
            placeTypes = placeTypes.map(function(pt) {
                pt.places = data.filter(function(fc) {
                    return fc.term.type == pt.identifier;
                });
                return pt;
            }).filter(function(pt) {
                return pt.places.length;
            });
            updateItems(placeTypes);
        }, function(){
            $scope.error = true;
        });

        $scope.placeClick = function(place) {
            $scope.imageController.highlightItem(place.description);
        };

        $scope.updateMap = function(type) {
            type.hidden = !type.hidden;
            $scope.imageController.updateItems($scope.placesTypes);
        };

        $scope.updateCat = function(category) {
            var newHidden = !category.hidden;
            angular.forEach($scope.typeCategories, function(type) {
                type.hidden = true;
            });
            angular.forEach($scope.placesTypes, function(type) {
                type.hidden = true;
            });
            category.hidden = newHidden;
            updateItems($scope.placesTypes);
        };

        function updateItems(data) {
            $scope.placesTypes = data;
            angular.forEach($scope.typeCategories, function(category) {
                var filteredTypes = $filter('isTypeCategory')($scope.placesTypes, category);
                angular.forEach(filteredTypes, function(type) {
                    type.hidden = category.hidden;
                });
            });
            $scope.imageController.updateItems($scope.placesTypes);
            $scope.name = mapTitle($scope.part, user);
        }
    }
])

.controller('AppPractice', ['$scope', '$routeParams', '$timeout', '$filter',
    'practiceService', 'userService', 'events', 'colors', '$', 'highlighted',
    'categoryService', 'flashcardService',

    function($scope, $routeParams, $timeout, $filter,
        practiceService, userService, events, colors, $, highlighted,
        categoryService, flashcardService) {
        'use strict';

        $scope.part = $routeParams.part;
        $scope.placeType = $routeParams.place_type;
        $scope.progress = 0;

        $scope.highlight = function() {
            var active = $scope.question;
            $scope.layer = $scope.imageController.getLayerContaining(active.description);
            $scope.imageController.highLightLayer($scope.layer);
            $scope.imageController.placeToFront(active.description);
            if ($filter('isPickNameOfType')($scope.question)) {
                $scope.imageController.highlightItem(active.description, colors.NEUTRAL);
            }
            if ($filter('isFindOnMapType')($scope.question) && active.options) {
                var codes = active.options.map(function(option) {
                    return option.description;
                });
                highlighted.setHighlighted(codes);
                $scope.imageController.highlightItems(codes, colors.NEUTRAL);
            }
        };

        $scope.checkAnswer = function(selected) {
            var asked = $scope.question.description;
            highlightAnswer(asked, selected);
            $scope.question.answered_code = selected;
            $scope.question.responseTime += new Date().valueOf();
            var selectedFC = flashcardService.getFlashcardByDescription(selected);
            practiceService.saveAnswerToCurrentFC(selectedFC.id, $scope.question.responseTime);
            $scope.progress = 100 * (practiceService.getSummary().count / practiceService.getConfig().set_length);
            //user.addAnswer(asked == selected);
            if (asked == selected) {
                $timeout(function() {
                    $scope.next();
                }, 700);
            } else {
                $scope.canNext = true;
            }
        };

        $scope.next = function() {
            if ($scope.progress < 100) {
                practiceService.getFlashcard().then(function(q) {
                    setQuestion(q);
                }, function(){
                    $scope.error = true;
                });
            } else {
                setupSummary();
            }
        };

        function highlightAnswer (asked, selected) {
            if ($filter('isFindOnMapType')($scope.question)) {
                $scope.imageController.highlightItem(asked, colors.GOOD);
            }
            $scope.imageController.highlightItem(selected, asked == selected ? colors.GOOD : colors.BAD);
            if ($filter('isPickNameOfType')($scope.question) && $scope.question.options) {
                highlightOptions(selected);
            }
        }

        function setupSummary() {
            $scope.question.slideOut = true;
            $scope.layer = undefined;
            // prevents additional points gain. issue #38
            $scope.summary = practiceService.getSummary();
            $scope.summary.correctlyAnsweredRatio = $scope.summary.correct / $scope.summary.count;
            console.log($scope.summary);
            $scope.showSummary = true;
            $scope.imageController.clearHighlights();
            $scope.imageController.hideLayers();
            //$scope.imageController.showSummaryTooltips($scope.summary.flashcards);
            angular.forEach($scope.summary.flashcards, function(q) {
                var correct = q.description == q.answered_code;
                $scope.imageController.showLayerContaining(q.description);
                $scope.imageController.highlightItem(q.description, correct ? colors.GOOD : colors.BAD, 1);
            });
            $("html, body").animate({ scrollTop: "0px" });
            //TODO fix this when answered_count available
            // events.emit('questionSetFinished', userService.getUser().answered_count);
        }

        function setQuestion(active) {
            console.log(active);
            if ($scope.question) {
                $scope.question.slideOut = true;
            }
            $scope.question = active;
            $scope.question.responseTime = - new Date().valueOf();
            $scope.questions.push(active);
            $scope.imageController.clearHighlights();
            $scope.highlight();
            $scope.canNext = false;
        }

        function highlightOptions(selected) {
            $scope.question.options.map(function(o) {
                o.correct = o.description == $scope.question.description;
                o.selected = o.description == selected;
                o.disabled = true;
                return o;
            });
        }

        function isInActiveLayer(code) {
            console.log($scope.layer);
            return $scope.layer == $scope.imageController.getLayerContaining(code);
        }

        $scope.mapCallback = function() {
            practiceService.initSet('common');
            // var cat = categoryService.getCategory($scope.part);
            var filter = {
                // TODO identifier missing in categoreis
                contexts : [$routeParams.part],
            };
            if ($routeParams.place_type) {
                filter.types = [$routeParams.place_type];
            }
            flashcardService.getFlashcards(filter);
            practiceService.setFilter(filter);
            practiceService.getFlashcard().then(function(q) {
                $scope.questions = [];
                setQuestion(q);
            }, function(){
                $scope.error = true;
            });
            $scope.imageController.onClick(function(code) {
                if ($filter('isFindOnMapType')($scope.question) &&
                    !$scope.canNext &&
                    $filter('isAllowedOption')($scope.question, code) &&
                    isInActiveLayer(code)) {

                    $scope.checkAnswer(code);
                    $scope.$apply();
                }
      });
    };
  }])

.controller('AppOverview', ['$scope', '$routeParams', 'categoryService', 'userStatsService', 'placeTypeService',
    function($scope, $routeParams, categoryService, userStatsService, placeTypeService) {
        'use strict';

        // var mapSkills = {};

        $scope.user = $routeParams.user || '';
        categoryService.getAll().then(function(categories){
            $scope.mapCategories = categories;
            var maps = [];
            for (var i in categories) {
              maps = maps.concat(categories[i].maps);
            }
            var placeTypes = placeTypeService.getTypes();
            for (i = 0; i < maps.length; i++) {
              var map = maps[i];
              for (var j = 0; j < placeTypes.length; j++) {
                var pt = placeTypes[j];
                var id = map.identifier + '-' + pt.identifier;
                userStatsService.addGroup(id, {});
                userStatsService.addGroupParams(id, undefined, [map.identifier], [pt.identifier]);
              }
            }

            userStatsService.getStatsPost().success(function(data) {
              processStats(data);
              userStatsService.getStatsPost(true).success(processStats);
            });

            function processStats(data) {
              console.log(data.data);
              $scope.userStats = data.data;
              angular.forEach(maps, function(map) {
                map.placeTypes = [];
                angular.forEach(angular.copy(placeTypes), function(pt) {
                  var key = map.identifier + '-' + pt.identifier;
                  pt.stats = data.data[key];
                  if (pt.stats && pt.stats.number_of_flashcards > 0) {
                    map.placeTypes.push(pt);
                  }
                });
              });
              $scope.statsLoaded = true;
            }
        }, function(){});

        $scope.mapSkills = function(map, type) {
            if (!$scope.statsLoaded) {
                return;
            }
            var defalut = {
                count : 0
            };
            if (!type) {
                return avgSkills(map);
            }
            return type.stats || defalut;
        };

        function avgSkills(map) {
            var avg = {};
            angular.forEach(map.placeTypes, function(pt) {
              for (var i in pt.stats) {
                if (!avg[i]) {
                  avg[i] = 0;
                }
                avg[i] += pt.stats[i];
              }
            });
            return avg;
        }
    }
])

.controller('AppConfused', ['$scope', '$http',
    function($scope, $http){
        'use strict';
        $http.get('/confused/').success(function(data){
            angular.forEach(data, function(p){
                p.wrongRatio = p.mistake_count / p.asked_count;
            });
            $scope.confused = data;
            $scope.loaded = true;
        }).error(function(){
            $scope.loaded = true;
            $scope.error = true;
        });
    }
])

.controller('AppUser', ['$scope', 'userService', '$routeParams', '$location', 
    '$timeout', 'gettext',
    function($scope, userService, $routeParams, $location, $timeout, gettext) {

  $scope.profileUrl = $location.absUrl();
  $scope.user = {username: $routeParams.user};
  $scope.user = userService.user;
  console.log(userService.loadUser());
  /*
  userService.loadUser($routeParams.user).success(function(data){
    $scope.user = data;
    $scope.editRights = data.username == userService.user.username;

    if ($routeParams.edit !== undefined && $scope.editRights) {
      $timeout(function() {
        $scope.editableForm.$show();
      },10);
    }
  });
  */

  $scope.saveUser = function() {
    // $scope.user already updated!
    return userService.save($scope.user).error(function(err) {
      if(err.field && err.msg) {
        // err like {field: "name", msg: "Server-side error for this username!"} 
        $scope.editableForm.$setError(err.field, err.msg);
      } else { 
        // unknown error
        $scope.editableForm.$setError('name', gettext("V aplikaci bohužel nastala chyba."));
      }
    });
  };

}])


.controller('ReloadController', ['$window', function($window){
    'use strict';
    $window.location.reload();
}]);

