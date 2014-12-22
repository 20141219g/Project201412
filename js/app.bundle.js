"use strict";

angular.module('starter', [ 'ionic',
                            'openfb',
                            'starter.controllers',
                            'starter.directives',
                            'starter.services',
                            'ionic.contrib.ui.cards'
                          ])
    .run(['$rootScope', '$state', '$ionicPlatform', '$window', 'OpenFB', function ($rootScope, $state, $ionicPlatform, $window, OpenFB) {
        $ionicPlatform.ready(function () {
            // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
            // for form inputs)
            if (window.cordova && window.cordova.plugins.Keyboard) {
                cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
            }
            if (window.StatusBar) {
                // org.apache.cordova.statusbar required
                StatusBar.styleDefault();
            }
        });

        OpenFB.init('375368743085', $window.location.origin + "/oauthcallback.html");
        // OpenFB.init('100542479991638', $window.location.origin + "/oauthcallback.html");

        $rootScope.$on('$stateChangeStart', function(event, toState) {
            if (toState.name !== "app.splash" && toState.name !== "app.logout" && !$window.sessionStorage['fbtoken']) {
                $state.go('app.splash');
                event.preventDefault();
            }
        });

        $rootScope.$on('OAuthException', function() {
            $state.go('app.splash');
        });
    }])
    .config(['$stateProvider', '$urlRouterProvider', function ($stateProvider, $urlRouterProvider) {
        $stateProvider
            .state('app', {
                url: "/app",
                abstract: true,
                templateUrl: "templates/menu.html",
                controller: 'AppCtrl'
            })
            .state('app.splash', {
                url: '/splash',
                views: {
                    'menuContent': {
                        templateUrl: 'templates/splash.html',
                        controller: 'SplashCtrl'
                    }
                }
            })
            .state('app.swipe', {
                url: "/swipe",
                views: {
                    'menuContent': {
                        templateUrl: "templates/swipe.html",
                        controller: 'SwipeCtrl'
                    }
                }
            })
            .state('app.logout', {
                url: "/logout",
                views: {
                    'menuContent': {
                        templateUrl: "templates/logout.html",
                        controller: "LogoutCtrl"
                    }
                }
            })
            ;
        // if none of the above states are matched, use this as the fallback
        $urlRouterProvider.otherwise('/app/swipe');
    }]);

angular.module('starter.controllers', [])

    .controller('AppCtrl', ['$scope', '$state', '$log', 'OpenFB', 'accountService', function ($scope, $state, $log, OpenFB, accountService) {
        $scope.logout = function () {
            accountService.reset();
            OpenFB.logout();
            $state.go('app.splash');
        };

        $scope.revokePermissions = function () {
            accountService.reset();
            OpenFB.revokePermissions().then(
                function () {
                    $state.go('app.splash');
                },
                function () {
                    $log.log('Revoke permissions failed');
                });
        };
    }])
    .controller('SwipeCtrl', ['$rootScope', '$scope', '$state', '$ionicSwipeCardDelegate', '$timeout', '$log', 'accountService', 'quoteService', function ($rootScope, $scope, $state, $ionicSwipeCardDelegate, $timeout, $log,
                                       accountService, quoteService) {
        $rootScope.scrollable = false;

        // Keep track of score
        var direction = {
            right: 0,
            left: 0,
            reset: function () {
                this.right = 0;
                this.left = 0;
            }
        };

        var numSwiped = 0;
        $scope.swipe = function(id) {
            var likeIt = direction.right > direction.left;
            $log.log('Card', id, 'swipe:', likeIt);
            direction.reset();
            --numSwiped;

            if (likeIt) {
                accountService.likeCard(id, function() {});
            }

            if (numSwiped === 0) {
                // end of cards
                //$state.go('app.messages');
                $scope.moreReady = true;
            }
        };

        $scope.swipeLeft = function(idx) {
            direction.left++;
            $log.log("press left");
            $ionicSwipeCardDelegate.popCard($scope, true);
        }

        $scope.swipeRight = function(idx) {
            direction.right++;
            $log.log("press right");
            $ionicSwipeCardDelegate.popCard($scope, true);
        }

        $scope.dragged = function ($event) {
            if ($event.gesture.direction === 'right') {
                direction.right++;
                $log.log("dragged right");
            } else if ($event.gesture.direction === 'left') {
                direction.left++;
                $log.log("dragged left");
            }
        };

        // Initiate cards
        var getQuotesLoading = function (initial) {
            var quotes = quoteService.getQuotes();

            var i = Math.floor(Math.random() * quotes.length);

            $timeout(getQuotesLoading, 4000);

            if (initial) {
                $scope.viewLoadingHeader = "Get Ready..."
                $scope.viewLoadingFact = "We'll show connections. Swipe left to pass, swipe right to message now."
            } else {
                $scope.viewLoadingHeader = "Humble Quotes"
                $scope.viewLoadingFact = quotes[i];
            }
        };
        getQuotesLoading(true);

        $scope.viewReady = false;
        $scope.viewTitle = "Loading";
        var imgLoaded = 0;
        $scope.imageLoaded = function () {
            imgLoaded++;
            if (imgLoaded === $scope.cards.length) {
                $scope.viewReady = true;
                $scope.viewTitle = "Swipe To Like";
            }
        }

        $scope.cards = [];
        var getCards = function(offset) {
            var cards = [];
            accountService.getCards(offset, function (error, data) {
                if (null != data) {
                    for (var i = 0; i < data.length; i++) {
                        cards.push({
                            fbId: data[i].fbId,
                            name: data[i].name,
                            image: data[i].imgUrl,
                            caption: data[i].message,
                            date: data[i].updateTime
                        });
                    }
                    $scope.cards = cards;
                    numSwiped = $scope.cards.length;
                    imgLoaded = 0;

                    $log.log('Cards: ', $scope.cards);
                } else {
                    $scope.cards = cards;
                    $log.log('Error: ' + JSON.stringify(error));
                }
            });
        };

        if ($scope.cards.length === 0) {
            var offset = 0;
            getCards(offset);
            $scope.moreReady = false;
        }

        $scope.getMoreCards = function() {
            ++offset;
            getCards(offset);
            getQuotesLoading(true);
            imgLoaded = 0;
            $scope.moreReady = false;
            $scope.viewReady = false;
            $scope.viewTitle = "Loading";
        }
    }])
    .controller('SplashCtrl', ['$scope', '$state', '$log', 'OpenFB', function($scope, $state, $log, OpenFB) {
        // Called to navigate to the main app
        $scope.facebookLogin = function () {
            OpenFB.login(//'email,' +
            //'read_stream,' +
            //'publish_stream,' +
            //'public_profile,' +
            //'basic_info,' +
            'friends_photos,' +
            'friends_status,' +
            'user_friends,' +
            'user_status').then(
                function () {
                    $state.go('app.swipe');
                },
                function () {
                    $log.log('Error: OpenFB login failed');
                });
        };
    }])

;

angular.module('starter.directives', [])

    .directive('noScroll', ['$document', function ($document) {

        return {
            restrict: 'A',
            link: function ($scope, $element, $attr) {
                $document.on('touchmove', function (e) {
                    // console.log($attr.noScroll)
                    if ($attr.noScroll === 'true') {
                        e.preventDefault();
                    }
                });
            }
        }
    }])

    .directive('imageonload', function () {
        return {
            restrict: 'A',
            link: function ($scope, $element, $attrs) {
                $element.bind('load', function () {
                    $scope.$apply($attrs.imageonload);
                });
            }
        };
    });

angular.module('starter.services', [])
    // Service vs Factory
    // http://stackoverflow.com/questions/14324451/angular-service-vs-angular-factory
    .factory("quoteService", function() {
        // http://www.brainyquote.com/quotes/keywords/giving.html
        var quotes = [
            {src:"Thomas A. Edison", quote:"Our greatest weakness lies in giving up. The most certain way to succeed is always to try just one more time."},
            {src:"Henri Nouwen", quote:"When we honestly ask ourselves which person in our lives means the most to us, we often find that it is those who, instead of giving advice, solutions, or cures, have chosen rather to share our pain and touch our wounds with a warm and tender hand."},
            {src:"Robert Louis Stevenson", quote:"You can give without loving, but you can never love without giving."},
            {src:"H. Jackson Brown, Jr.", quote:"Remember that the happiest people are not those getting more, but those giving more."},
            {src:"Ezra Taft Benson", quote:"Our parents deserve our honor and respect for giving us life itself. Beyond this they almost always made countless sacrifices as they cared for and nurtured us through our infancy and childhood, provided us with the necessities of life, and nursed us through physical illnesses and the emotional stresses of growing up."},
            {src:"Henry Drummond", quote:"Happiness... consists in giving, and in serving others."}
        ];
        return {
          getQuotes: function() {
              return quotes;
          }
        };
    })
    .factory("accountService", ['$http', '$log', '$timeout', 'OpenFB', function($http, $log, $timeout, OpenFB) {
        var maxCardsPerPage = 10;
        var accessToken = null;

        var cardsCache;
        var lastShownOffset;
        var shownCache;
        var lastShownCards;
        var resetCache = function() {
            cardsCache = [];
            lastShownOffset = 0;
            lastShownCards = [];
            shownCache = [];
        };
        resetCache();

        var getFriendUrl = function(id) {
            return "/v1.0/" + id + "/statuses";
        };
        var processFriendJsonAsync = function(entry, callback) {
            OpenFB.get(getFriendUrl(entry.fbId))
                .success(function (result) {
                    //$log.log("Processing json: " + entry.id + " " + JSON.stringify(result));
                    for (var i = 0; i < result.data.length; ++i) {
                        var likeCount = (null != result.data[i].likes) ? result.data[i].likes.data.length : 0;
                        var daysSincePost = ((new Date().getTime() - new Date(result.data[i].updated_time).getTime()) / 86400000) + 1; // add 1 so never 0
                        var likeRank = likeCount * (1.0 / daysSincePost);
                        if (null == entry.likeRank || likeRank >= entry.likeRank) {
                            entry.likeCount = likeCount;
                            entry.commentCount = (null != result.data[i].comments) ? result.data[i].comments.data.length : 0;
                            entry.message = result.data[i].message;
                            entry.updateTime = new Date(result.data[i].updated_time);
                            entry.daysSincePost = daysSincePost;
                            entry.likeRank = likeRank;
                            entry.statusId = result.data[i].id;
                        }
                    }
                    //$log.log("id: " + entry.id
                    //    + " rank: " + entry.likeRank
                    //    + " msg: " + entry.message
                    //    + " likes: " + entry.likeCount
                    //    + " update: " + entry.updateTime
                    //    + " days: " + entry.daysSincePost);
                    callback(entry);
                })
                .error(function(error) {
                    callback(null);
                });
        };
        var getMeUrl = function() {
            return "/v1.0/me?fields=friends{name,picture}"; //,home{from}";
        };
        var processMeJson = function(json) {
            //$log.log("Processing json: " + JSON.stringify(json));
            resetCache();
            for (var i = 0; i < json.friends.data.length; ++i) {
                var entry = {
                    fbId: json.friends.data[i].id,
                    name: json.friends.data[i].name,
                    imgUrl: json.friends.data[i].picture.data.url,
                    message: null
                };
                cardsCache.push(entry);
            }
            $log.log("Processed " + cardsCache.length + " cards");
        };
        var processCards = function(pageIndex, callback) {
            lastShownCards = [];
            var completeCount = 0;
            var didCallCallback = false;
            var startTime = new Date().getTime();
            var processFriends = function(startIndex) {
                for (var i = 0; ((i < maxCardsPerPage) && (completeCount < maxCardsPerPage) && (i + lastShownOffset + startIndex < cardsCache.length)); ++i) {
                    if (didCallCallback) {
                        break;
                    }
                    processFriendJsonAsync(cardsCache[lastShownOffset + startIndex + i], function(result) {
                        if (null != result) {
                            if (null != result.message) {
                                lastShownCards.push(result);
                                ++completeCount;
                            } else {
                                $log.log("Processed " + result.id + " skipped");
                            }
                            if (completeCount == maxCardsPerPage && !didCallCallback) {
                                didCallCallback = true;
                                var endTime = new Date().getTime();
                                $log.log("Processed " + lastShownCards.length + " to show limit - " + (endTime - startTime));
                                shownCache.push(lastShownCards);
                                lastShownOffset += lastShownCards.length;
                                callback(null, lastShownCards);
                            }
                        }
                    });
                }
                $timeout(function() {
                    if (!didCallCallback) {
                        if (completeCount < maxCardsPerPage) {
                            processFriends(maxCardsPerPage);
                        }
                    }
                }, 1000);
            };
            processFriends(0);
            $timeout(function() {
                if (!didCallCallback) {
                    didCallCallback = true;
                    var endTime = new Date().getTime();
                    $log.log("Timeout: processed " + lastShownCards.length + " in time " + (endTime - startTime));
                    shownCache.push(lastShownCards);
                    lastShownOffset += lastShownCards.length;
                    callback(null, lastShownCards);
                }
            }, 10000);
        };

        return {
            getCards: function(pageIndex, getCardsCallback) {
                // http://www.sitepoint.com/tidy-angular-controllers-factories-services/
                //  /v1.0/me?fields=friends{statuses},statuses
                if (0 == cardsCache.length) {
                    var url = getMeUrl();
                    //$log.log("Retrieving jsonp: " + url);
                    OpenFB.get(getMeUrl())
                        .success(function (result) {
                            processMeJson(result);
                            processCards(pageIndex, getCardsCallback);
                        })
                        .error(function (error) {
                            $log.log("GetCards Error: " + JSON.stringify(error));
                            getCardsCallback(error, null);
                        });
                } else {
                    processCards(pageIndex, getCardsCallback);
                }
            },
            likeCard: function(cardId, callback) {
                // TODO
                $log.log("Like: " + cardId + ", but you can't update a status using the Graph API.");
                callback();
            },
            reset: function() {
                resetCache();
            }
        };
    }])
;
