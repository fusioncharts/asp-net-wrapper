/**!
 * @license FusionCharts JavaScript Library
 * Copyright FusionCharts Technologies LLP
 * License Information at <http://www.fusioncharts.com/license>
 */
/**
 * @private
 * @module fusioncharts.api.themes.ocean
 *
 * @export themes/fusioncharts.themes.ocean.js
 */
FusionCharts.register('module', ['private', 'modules.theme.ocean', function () {
    this.registerTheme([
        {
            name: 'ocean',
            theme: {
                base: {
                    chart: {
                        paletteColors:
                            '#04476c,#0e948c,#4d998d,#64ad93,#77be99,#8fcda0,#a7dca6,#bbe7a0,#cef19a,#dcefc1',
                        labelDisplay: 'auto',
                        baseFontColor: '#333333',
                        baseFont: 'Helvetica Neue,Arial',
                        captionFontSize: '14',
                        subcaptionFontSize: '14',
                        subcaptionFontBold: '0',
                        showBorder: '0',
                        bgAlpha: '0',
                        showShadow: '0',
                        canvasBgColor: '#ffffff',
                        canvasBorderAlpha: '0',
                        useplotgradientcolor: '0',
                        useRoundEdges: '0',
                        showPlotBorder: '0',
                        showAlternateHGridColor: '0',
                        toolTipColor: '#04476c',
                        toolTipBorderColor: '#04476c',
                        toolTipBgColor: '#ffffff',
                        legendBgAlpha: '0',
                        legendBorderAlpha: '0',
                        legendShadow: '0',
                        legendItemFontSize: '10',
                        legendItemFontColor: '#666666',
                        legendCaptionFontSize: '9',
                        divlineAlpha: '100',
                        divlineColor: '#999999',
                        divlineThickness: '1',
                        divLineIsDashed: '1',
                        divLineDashLen: '1',
                        divLineGapLen: '1',
                        scrollheight: '10',
                        flatScrollBars: '1',
                        scrollColor: '#cccccc',
                        showHoverEffect: '1',
                        valueFontSize: '10',
                        showXAxisLine: '1',
                        xAxisLineThickness: '1',
                        xAxisLineColor: '#999999'
                    },
                    dataset: [
                        {
                        }
                    ],
                    trendlines: [
                        {
                        }
                    ]
                },
                pie2d: {
                    chart: {
                        placeValuesInside: '0',
                        use3dlighting: '0',
                        valueFontColor: '#333333',
                        captionPadding: '15'
                    }
                },
                doughnut2d: {
                    chart: {
                        placeValuesInside: '0',
                        use3dlighting: '0',
                        valueFontColor: '#333333',
                        centerLabelFontSize: '12',
                        centerLabelBold: '1',
                        centerLabelFontColor: '#333333',
                        captionPadding: '15'
                    }
                },
                msline: {
                    chart: {
                    }
                },
                column2d: {
                    chart: {
                        paletteColors: '#04476c',
                        valueFontColor: '#ffffff',
                        placeValuesInside: '1',
                        rotateValues: '1'
                    }
                },
                bar2d: {
                    chart: {
                        paletteColors: '#04476c',
                        valueFontColor: '#ffffff',
                        placeValuesInside: '1'
                    }
                },
                column3d: {
                    chart: {
                        paletteColors: '#04476c',
                        valueFontColor: '#ffffff',
                        placeValuesInside: '1',
                        rotateValues: '1'
                    }
                },
                bar3d: {
                    chart: {
                        paletteColors: '#04476c',
                        valueFontColor: '#ffffff',
                        placeValuesInside: '1'
                    }
                },
                area2d: {
                    chart: {
                        valueBgColor: '#ffffff',
                        valueBgAlpha: '90',
                        valueBorderRadius: '4',
                        valueBorderThickness: '2'
                    }
                },
                mscolumn2d: {
                    chart: {
                        valueFontColor: '#ffffff',
                        placeValuesInside: '1',
                        rotateValues: '1'
                    }
                },
                mscombi2d: {
                },
                scrollcolumn2d: {
                    chart: {
                        valueFontColor: '#ffffff',
                        placeValuesInside: '1',
                        rotateValues: '1'
                    }
                },
                angulargauge: {
                    chart: {
                        pivotFillColor: '#ffffff',
                        pivotRadius: '4',
                        gaugeFillMix: '{light+0}',
                        showTickValues: '1',
                        majorTMHeight: '12',
                        majorTMThickness: '2',
                        majorTMColor: '#000000',
                        minorTMNumber: '0',
                        tickValueDistance: '10',
                        valueFontSize: '24',
                        valueFontBold: '1',
                        gaugeInnerRadius: '50%',
                        showHoverEffect: '0'
                    },
                    dials: {
                        dial: [
                            {
                                baseWidth: '10',
                                rearExtension: '7',
                                bgColor: '#000000',
                                bgAlpha: '100',
                                borderColor: '#666666',
                                bgHoverAlpha: '20'
                            }
                        ]
                    }
                },
                bubble: {
                    chart: {
                        use3dlighting: '0',
                        showplotborder: '0',
                        showYAxisLine: '1',
                        showAlternateHGridColor: '0',
                        showAlternateVGridColor: '0'
                    },
                    categories: [
                        {
                            verticalLineDashed: '1',
                            verticalLineDashLen: '1',
                            verticalLineDashGap: '1',
                            verticalLineThickness: '1',
                            verticalLineColor: '#000000',
                            category: [
                                {
                                }
                            ]
                        }
                    ],
                    vtrendlines: [
                        {
                            line: [
                                {
                                    alpha: '0'
                                }
                            ]
                        }
                    ]
                }
            }
        }
    ]);
}]);
