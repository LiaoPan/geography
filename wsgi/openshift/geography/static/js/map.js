(function() {
  'use strict';
  /* global hash  */
  /* global jQuery  */
  /* global chroma  */
  /* global Kartograph */
  var STROKE_WIDTH = 1.5;
  var RIVER_WIDTH = STROKE_WIDTH * 2;
  var WATER_COLOR = '#73c5ef';
  var ANIMATION_TIME_MS = 500;

  angular.module('blindMaps.map', [])

  .value('chroma', chroma)

  .value('$', jQuery)

  .value('$K', Kartograph)

  .value('colors', {
    'GOOD': '#0d0',
    'BAD': '#ff0000',
    'NEUTRAL': '#bbb',
    'BRIGHT_GRAY' : '#ddd'

  })
  
  .value('stateAlternatives', [
        "region",
        "province",
        "region_cz",
        "region_it",
        "bundesland",
        "autonomous_comunity",
      ])

  .factory('getLayerConfig', function($log, chroma, colors, citySizeRatio, stateAlternatives) {
    var scale = chroma.scale([
        colors.BAD,
        '#ff4500',
        '#ffa500',
        '#ffff00',
        colors.GOOD
      ]);

    return function(config) {
      var layerConfig = {};
      layerConfig.bg = {
        'styles' : {
          'fill' : colors.BRIGHT_GRAY,
          'stroke-width' : STROKE_WIDTH,
          'transform' : ''
        }
      };

      layerConfig.state = {
        'styles' : {
          'fill' : function(d) {
            var state = config.state && config.state[d.code];
            return state ? scale(state.probability).brighten((1 - state.certainty) * 80).hex() : '#fff';
          },
          'stroke-width' : STROKE_WIDTH,
          'transform' : ''
        },
        'click' : function(data) {
          $log.log(data.code);
          if (config.click !== undefined) {
            config.click(data.code);
          }
        }
      };

      if (config.showTooltips) {
        layerConfig.state.tooltips = function(d) {
          var state = config.state && config.state[d.code];
          var name = ( state ?
            '<span class="label">' +
              '<i class="flag-' + d.code + '"></i> ' +
              state.name +
              '</span>' :
            '<br>Zatím neprocvičováno<br><br>');
          var description = (state ?
            '<div>' +
              '<i class="color-indicator" style="background-color :' +
              scale(state.probability).hex() + '"></i>' +
              ' Odhad znalosti : ' + Math.round(100 * state.probability) + '%</div>' :
            '');
          return [
            name + description,
            config.state[d.code] ? config.state[d.code].name : ''
          ];
        };
      }
      
      angular.forEach(stateAlternatives, function(sa){
        layerConfig[sa] = angular.copy(layerConfig.state, {});
      });
      
      layerConfig.mountains = angular.copy(layerConfig.state, {});

      layerConfig.river = angular.extend(angular.extend({}, layerConfig.state), {
        'styles' : {
          'stroke-width' : RIVER_WIDTH,
          'stroke' : WATER_COLOR,
          'transform' : ''
        },
        'mouseenter' : function(data, path) {
          var zoomRatio = 4;
          var animAttrs = { 'stroke-width' : zoomRatio * RIVER_WIDTH };
          path.animate(animAttrs, ANIMATION_TIME_MS / 2, '>');
        },
        'mouseleave' : function(data, path) {
          var animAttrs = { 'stroke-width' : RIVER_WIDTH };
          path.animate(animAttrs, ANIMATION_TIME_MS / 2, '>');
        }
      });

      layerConfig.city = angular.extend(angular.extend({},layerConfig.state), {
        'mouseenter' : function(data, path) {
          path.toFront();
          var zoomRatio = 2.5 / citySizeRatio(data.population);
          var animAttrs = {
              'transform' : 's' + zoomRatio,
              'stroke-width' : zoomRatio * STROKE_WIDTH
            };
          path.animate(animAttrs, ANIMATION_TIME_MS / 2, '>');
        },
        'mouseleave' : function(data, path) {
          var animAttrs = {
              'transform' : '',
              'stroke-width' : STROKE_WIDTH
            };
          path.animate(animAttrs, ANIMATION_TIME_MS / 2, '>');
        }
      });

      layerConfig.lakes = angular.copy(layerConfig.city, {});
      layerConfig.lakes.styles.fill = function(d) {
        var state = config.state && config.state[d.name];
        return state ? scale(state.probability).brighten((1 - state.certainty) * 80).hex() : WATER_COLOR;
      };
      return layerConfig;
    };
  })
  
  .factory('initLayers', function(getLayerConfig, stateAlternatives) {

    function _hideLayer(layer){
      var paths = layer ? layer.getPaths({}) : [];
      angular.forEach(paths, function(path) {
        path.svgPath.hide();
      });
    }

    return function(map, config) {
      var layersConfig = getLayerConfig(config);
      var layersArray = [];
      for (var i in layersConfig) {
        map.addLayer(i, layersConfig[i]);
        var l = map.getLayer(i);
        if (l) {
          layersArray.push(l);
          if (l.id != 'bg') {
            _hideLayer(l);
          }
        }
      }
      var that = {
        hideLayer : function(layer) {
          _hideLayer(layer);
        },
        showLayer : function(layer) {
          var paths = layer ? layer.getPaths({}) : [];
          angular.forEach(paths, function(path) {
            path.svgPath.show();
          });
        },
        getLayerBySlug: function(slug) {
          var ret;
          angular.forEach(layersArray, function(l) {
            if (l.id == slug) {
              ret = l;
            }
          });
          return ret;
        },
        getAll : function(){
          return layersArray;
        },
        getConfig : function(layer){
          return layersConfig[layer.id];
        },
        getStateAlternative : function() {
          var ret;
          angular.forEach(stateAlternatives.concat(['state']), function(alternative){
            l = getLayerBySlug(alternative);
            if (l) {
              ret = l;
            }
          })
          return ret;
        }
      };
      return that;
    };
  })
  
  .factory('mapFunctions', function($timeout, $, stateAlternatives){
    var that = {
      getZoomRatio : function(bboxArea) {
        var zoomRatio = Math.max(1.2, 70 / Math.sqrt(bboxArea));
        return zoomRatio;
      },
      initMapZoom : function(paper) {
        var panZoom = paper.panzoom({});
        panZoom.enable();
  
        $('#zoom-in').click(function(e) {
          panZoom.zoomIn(1);
          e.preventDefault();
        });
  
        $('#zoom-out').click(function(e) {
          panZoom.zoomOut(1);
          e.preventDefault();
        });
        return panZoom;
      },
      getHighlightAnimationAttributes : function(placePath, layer, origStroke, color, zoomRatio) {
        var bbox = placePath.svgPath.getBBox();
        var bboxArea = bbox.width * bbox.height;
        zoomRatio = zoomRatio || that.getZoomRatio(bboxArea);
        var animAttrs = {
            transform : 's' + zoomRatio,
            'stroke-width' : Math.min(6, zoomRatio) * origStroke
          };
        if (color) {
          if (layer.id == 'river') {
            animAttrs.stroke = color;
          } else {
            animAttrs.fill = color;
          }
        }
        return animAttrs;
      },
      isStateAlternative : function (id) {
        var ret;
        angular.forEach(stateAlternatives.concat(['state']), function(alternative){
          if (id == alternative) {
            ret = alternative;
          }
        })
        return ret;        
      }
    };
    return that;
  })
  
  .service('citySizeRatio', function(){
    return function (population) {
      if (population > 5000000) {
        return 1.8;
      } else if (population > 1000000) {
        return 1.4;
      } else if (population > 500000) {
        return 1.2;
      } else if (population > 100000) {
        return 1;
      } else if (population > 30000) {
        return 0.8;
      } else {
        return 0.6;
      }
    };
  })
  
  .service('getMapResizeFunction', function($, citySizeRatio){

    function getNewHeight(mapAspectRatio, isPractise, holderInitHeight) {
      $('#ng-view').removeClass('horizontal');
      var newHeight;
      if (isPractise) {
        var screenAspectRatio = $(window).height() / $(window).width();
        if (screenAspectRatio - mapAspectRatio < -0.2) {
          $('#ng-view').addClass('horizontal');
          newHeight = $(window).height() + 5;
        } else {
          var controlsHeight = $(window).width() > 767 ? 290 : 200;
          newHeight = $(window).height() - controlsHeight;
        }
      } else if (holderInitHeight / mapAspectRatio >= $(window).width()) {
        newHeight = Math.max(holderInitHeight / 2, mapAspectRatio * $(window).width());
      } else {
        newHeight = holderInitHeight;
      }
      return newHeight;
    }
    
    function setCitiesSize(layer) {
      var paths = layer.paths;
      angular.forEach(paths, function(path) {
        var newRadius = path.svgPath.attr("r") * citySizeRatio(path.data.population);
        path.svgPath.attr({r: newRadius});
      });
    }

    return function(m, holder, practice) {
      var holderInitHeight = holder.height();
      var panZoom = m.panZoom;
      var map = m.map;
      var mapAspectRatio = map.viewAB.height / map.viewAB.width;
      
      return function () {
        var newHeight = getNewHeight(mapAspectRatio, practice, holderInitHeight);
        holder.height(newHeight);
        map.resize();
        if (panZoom) {
          panZoom.zoomIn(1);
          panZoom.zoomOut(1);
        }
        if (practice) {
          window.scrollTo(0, $('.navbar').height() - 8);
        }
        var l = map.getLayer("city");
        if(l) {
          setCitiesSize(l);
        }
      };
    };
  })
  
  .service('singleWindowResizeFn', function($){
    var fn = function(){};
    $(window).resize(function() {
      fn();
    });
    return function(newFn) {
      fn = newFn;
    };
  })

  .factory('mapControler', function($, $K, mapFunctions, initLayers, $filter) {
    
    $.fn.qtip.defaults.style.classes = 'qtip-dark';

    return function(mapCode, showTooltips, holder, callback) {
      var config = { state : [] };
      var layers;
      var _placesByTypes;
      
      config.showTooltips = showTooltips;
      config.isPractise = !showTooltips;
      config.state = [];
  
      var myMap = {
        map :  $K.map(holder),
        panZoom : undefined,
        onClick : function(clickFn) {
          config.click = function(code) {
            if (!myMap.panZoom.isDragging()) {
              clickFn(code);
            }
          };
        },
        highlightStates : function(states, color, zoomRatio) {
          var state = states.pop();
          var layer = this.getLayerContaining(state);
          var placePath = layer ? layer.getPaths({ code : state })[0] : undefined;
          if (placePath && layer.id != "bg") {
            placePath.svgPath.toFront();
            var origStroke = layers.getConfig(layer).styles['stroke-width'];
            var animAttrs = mapFunctions.getHighlightAnimationAttributes(placePath, layer,
                origStroke, color, zoomRatio);
            placePath.svgPath.animate(animAttrs, ANIMATION_TIME_MS / 2, '>', function() {
              placePath.svgPath.animate({
                transform : '',
                'stroke-width' : origStroke
              }, ANIMATION_TIME_MS / 2, '<');
              myMap.highlightStates(states, color);
            });
          } else if (states.length > 0) {
            myMap.highlightStates(states, color);
          }
        },
        highlightState : function(state, color, zoomRatio) {
          myMap.highlightStates([state], color, zoomRatio);
        },
        clearHighlights : function() {
          angular.forEach(layers.getAll(), function(layer) {
            layer.style(layers.getConfig(layer).styles);
            layers.showLayer(layer);
          });
        },
        updatePlaces : function(placesByTypes) {
          if (layers === undefined) {
            _placesByTypes = placesByTypes;
            return;
          }
          angular.forEach(placesByTypes, function(type) {
            var l = layers.getLayerBySlug(type.slug);
            if (type.hidden) {
              layers.hideLayer(l);
            } else {
              layers.showLayer(l);
            }
          });
          
          var places = $filter('StatesFromPlaces')(placesByTypes);
          config.state = places;
          angular.forEach(layers.getAll(), function(layer) {
            var config = layers.getConfig(layer);
            layer.style('fill', config.styles.fill);
            if (config.tooltips) {
              layer.tooltips(config.tooltips);
            }

          });
        },
        getLayerContaining : function(placeCode) {
          var ret;
          angular.forEach(layers.getAll(), function(layer) {
            if (layer.getPaths({ code : placeCode }).length >= 1) {
              ret = layer;
            }
          });
          return ret;
        },
        showLayerContaining : function(placeCode) {
          var l = myMap.getLayerContaining(placeCode);
          layers.showLayer(l);
          if (l && l.id == "city") {
            layers.showLayer(layers.getStateAlternative());
          }
        },
        highLightLayer : function(layer) {
          angular.forEach(layers.getAll(), function(l) {
            if (l == layer || (layer && layer.id == 'city' && mapFunctions.isStateAlternative(l.id))) {
              layers.showLayer(l);
            }
            else if  (l.id != 'bg') {
              layers.hideLayer(l);
            }
          });
        },
        hideLayers : function() {
          angular.forEach(layers.getAll(), function(l) {
            if (l.id != 'bg') {
              layers.hideLayer(l);
            }
          });
        },
        placeToFront : function(placeCode) {
          angular.forEach(layers.getAll(), function(layer) {
            var place = layer.getPaths({ code : placeCode })[0];
            if (place) {
              place.svgPath.toFront();
            }
          });
        }
      };

      myMap.map.loadCSS(hash('static/css/map.css'), function() {
        myMap.map.loadMap(hash('static/map/' + mapCode + '.svg'), function() {
          layers = initLayers(myMap.map, config);
          if (_placesByTypes !== undefined) {
            myMap.updatePlaces(_placesByTypes);
          }
          myMap.panZoom = mapFunctions.initMapZoom(myMap.map.paper);
          callback(myMap);
        });
      });
      return myMap;
    };
  });
}());
