/**!
 * @license FusionCharts JavaScript Library
 * Copyright FusionCharts Technologies LLP
 * License Information at <http://www.fusioncharts.com/license>
 */
/**
 * @private
 * @module fusioncharts.api.themes.flat
 *
 * @export themes/fusioncharts.themes.flat.js
 */
FusionCharts.register('module', ['private', 'modules.theme.flat', function () {

    this.registerTheme([
        {
            name: 'flat1',
            theme: {
                base: {
                    chart: {                        
                        "bgAlpha": "0",
                        "showBorder": "1",
                        "borderAlpha": "20",
                        "plotBorderAlpha": "50",
                        "canvasBorderAlpha": "20",
                        "canvasBorderThickness": "1",
                        "usePlotGradientColor": "0",
                        "legendBorderAlpha": "20",
                        "legendShadow": "0",                        
                        "showShadow": "0",
                        "divLineAlpha": "20"
                    }
                }
            }
        },
        {
            name: 'flat2',
            theme: {
                base: {
                    chart: {
                        "paletteColors": "#008ee4,#6baa01",
                        "bgAlpha": "0",
                        "showBorder": "1",
                        "borderAlpha": "20",
                        "canvasBorderAlpha": "0",
                        "usePlotGradientColor": "0",
                        "legendBorderAlpha": "0",
                        "legendShadow": "0",
                        "legendBgAlpha": "0",                        
                        "showAxisLines": "1",
                        "axisLineAlpha": "25",                        
                        "showShadow": "0",
                        "divLineAlpha": "20"
                    }
                }
            }
        },
        {
            name: 'above-target',
            theme: {
                base: {
                    dataset: [{                        
                        data: function (index, dataObj) {
                            return {
                                dashed: Number(dataObj.value) < 25000 ? '0' : '1'
                            };
                        }
                    }]
                }
            }
        }
    ]);
}]);
