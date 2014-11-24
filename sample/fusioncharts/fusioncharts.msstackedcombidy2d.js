/**!
 * @license FusionCharts JavaScript Library MSStackedCombiDY2D Chart
 * Copyright FusionCharts Technologies LLP
 * License Information at <http://www.fusioncharts.com/license>
 *
 * @version 3.4.0
 */
/**
 * @private
 * @module fusioncharts.renderer.javascript.msstackedcombidy2d
 * @export fusioncharts.msstackedcombidy2d.js
 */
FusionCharts.register('module', ['private', 'modules.renderer.js-msstackedcombidy2d', function () {

    // Register the module with FusionCharts and als oget access to a global
    // variable within the core's scope.
    var global = this,
        win = global.window,
        CHARTS = 'charts',
        lib = global.hcLib,
        chartAPI = lib.chartAPI,
        moduleCmdQueue = lib.moduleCmdQueue,
        injectModule = lib.injectModuleDependency, // access module dependency

        creditLabel = false && !/fusioncharts\.com$/i.test(win.location.hostname),
        plotList = {
            'column': 'mscolumn2dbase',
            'column3d': 'mscolumn2dbase',
            'line': 'mslinebase',
            'spline': 'mslinebase',
            'stepline': 'mslinebase',
            'area': 'msareabase',
            'steparea': 'msareabase',
            'splinearea': 'msareabase'
        },

        msscdy2dlogic; // store logic as object to be defined later

    msscdy2dlogic = {
        friendlyName: 'Multi-series Dual Y-Axis Stacked Combination Chart',
        creditLabel: creditLabel,
        sformatnumberscale: 1,

        // Parse the categories and find the min and max date value
        series: function(FCObj, HCObj, chartName/*, width, height*/) {

            var FC_CONFIG_STRING = lib.FC_CONFIG_STRING,
                conf = HCObj[FC_CONFIG_STRING],
                pluck = lib.pluck,
                pluckNumber = lib.pluckNumber,
                getFirstValue = lib.getFirstValue,
                createTrendLine = lib.createTrendLine,
                UNDEFINED,

                FCChartObj = FCObj.chart,
                rootDatasets = FCObj.dataset,
                rootDatasetLen = rootDatasets && rootDatasets.length,
                rootDatasetIndex,
                rootDataset,
                datasetIndex,
                seriesIndex = 0,
                datasetLen,
                dataset,
                apiNames = plotList,
                catLength,
                series,
                lineArr = [],
                columnArr = [],
                areaArr = [],
                yAxisId,
                isPY,
                isSY,
                hideEmptyAxis = !!pluckNumber(FCChartObj.hideemptyaxis, 1),
                renderAs,
                columnPosition = -1,
                isColumn,
                isStacked,
                isStep,
                isStepFSteps,
                isStepDrawVJoins,
                isAreaOverColumns,
                i,
                ln;

            // If data
            if (FCObj.dataset && FCObj.dataset.length > 0) {

                //Enable the legend
                HCObj.legend.enabled = Boolean(pluckNumber(FCObj.chart.showlegend, 1));

                // Add category labels
                this.categoryAdder(FCObj, HCObj);
                catLength = conf.oriCatTmp.length;

                // Iterate through datasets
                for (rootDatasetIndex = 0;
                     rootDatasetIndex < rootDatasetLen;
                     rootDatasetIndex += 1) {

                    // If dataset exists
                    if ((rootDataset = rootDatasets[rootDatasetIndex])) {

                        // Get the chart type from dataset or the default chart type
                        renderAs = getFirstValue(rootDataset.renderas,
                                    this.defaultSeriesType).toLowerCase();
                        // Re-set chart type to column for an unvalid chart type
                        renderAs = apiNames[renderAs] && renderAs || 'column';

                        // Check whether the chart is a column chart
                        isColumn = (renderAs === 'column');

                        // Check whether the chart is stacked
                        isStacked = (rootDataset.dataset !== UNDEFINED);

                        // Probe Y-Axis id (0 for primary, 1 for secondary)
                        yAxisId = +(pluck(rootDataset.parentyaxis, 'p')
                                        .toLowerCase() === 's');

                        // Check for existance of a dataset attached to primary Axis
                        isPY = isPY || !yAxisId;
                        // Check for existance of a dataset attached to secondary Axis
                        isSY = isSY || !!yAxisId;

                        // Increment column's position when column chart
                        if (isColumn) {
                            columnPosition += 1;
                        }

                        // Iterate through the sub-datasets if exists or
                        // excute commands on the sole dataset
                        for (datasetIndex = 0,
                                datasetLen = rootDataset.dataset &&
                                        rootDataset.dataset.length || 1;
                                    datasetIndex < datasetLen;
                                    datasetIndex += 1, seriesIndex += 1) {

                            // Select sub-dataset if that exists or select the
                            // solo-dataset
                            dataset = rootDataset.dataset &&
                                    rootDataset.dataset[datasetIndex] ||
                                    rootDataset;

                            // Probe if the chart is Step line or step area
                            // from renderAs or legacy setting drawInStepMode
                            isStep = /stepline|steparea/.test(renderAs) ||
                                    /line|area/.test(renderAs) &&
                                            !!pluckNumber(dataset.drawinstepmode,
                                            rootDataset.drawinstepmode,
                                            FCChartObj.drawinstepmode, 0);

                            // Probe stepMode detailed customization related to
                            // useForwardSteps and drawVerticalJoins
                            if (isStep) {
                                isStepFSteps = !!pluckNumber(dataset.useforwardsteps,
                                                rootDataset.useforwardsteps,
                                                FCChartObj.useforwardsteps, 0);
                                isStepDrawVJoins = !!pluckNumber(
                                                dataset.drawverticaljoins,
                                                rootDataset.drawverticaljoins,
                                                FCChartObj.drawverticaljoins,
                                                1);
                            }

                            // Define stub series data
                            series = {
                                visible: !pluckNumber(dataset.initiallyhidden,
                                                    rootDataset.initiallyhidden,
                                                    FCChartObj.initiallyhidden, 0),
                                hoverEffects: this.parseSeriesHoverOptions(FCObj,
                                    HCObj, dataset, chartName),
                                data: [],
                                legendIndex: seriesIndex,
                                isStacked: isStacked,
                                yAxis: yAxisId
                            };

                            // Set coumn position when column
                            if (isColumn) {
                                series.columnPosition = columnPosition;
                            }

                            // Generate series data based on chart type
                            // Store in 3 different arrays - column/line/area
                            switch(renderAs){
                                case 'line':
                                case 'spline':
                                case 'stepline':
                                    series.type = 'line';
                                    // Add step line related options
                                    series.step = isStep;
                                    series.useForwardSteps = isStepFSteps;
                                    series.drawVerticalJoins = isStepDrawVJoins;
                                    lineArr.push(chartAPI.mslinebase.point.call(
                                        this,
                                        chartName, series, dataset,
                                        FCChartObj, HCObj, catLength,
                                        seriesIndex));
                                    break;

                                case 'area':
                                case 'splinearea':
                                case 'steparea':
                                    series.type = 'area';
                                    // Set series2D3Dshift as true for area chart
                                    HCObj.chart.series2D3Dshift = true;

                                    // Add step area related options
                                    series.step = isStep;
                                    series.useForwardSteps = isStepFSteps;
                                    series.drawVerticalJoins = isStepDrawVJoins;

                                    areaArr.push(chartAPI.msareabase.point.call(
                                        this,
                                        chartName, series, dataset,
                                        FCChartObj, HCObj, catLength,
                                        seriesIndex));
                                    break;

                                default:
                                    series.type = 'column';
                                    columnArr.push(chartAPI.mscolumn2dbase.point.call(
                                        this,
                                        chartName, series, dataset,
                                        FCChartObj, HCObj, catLength,
                                        seriesIndex, rootDatasetIndex,
                                        columnPosition));

                            }
                        }
                    }
                }

                // Check if area is over columns
                isAreaOverColumns = HCObj.chart.areaOverColumns =
                                        (FCChartObj.areaovercolumns !== '0');

                // Push the data at the series array
                HCObj.series = HCObj.series.concat(
                    isAreaOverColumns ? columnArr : areaArr,
                    isAreaOverColumns ? areaArr : columnArr,
                    lineArr
                );

                // The chart does not have a column - remember it!
                if (columnArr.length === 0) {
                    conf.hasNoColumn = true;
                }

                // Add column count
                for (i = 0, ln = columnArr.length;i < ln; i += 1) {
                    columnArr[i].numColumns = columnPosition + 1;
                }

                // Hide primary axis when no data is attached to that axis
                // unless hideEmptyAxis is set to 0 (disabled)
                if (hideEmptyAxis && !isPY) {
                    FCChartObj.showyaxisvalues = pluck(FCChartObj.showyaxisvalues, 0);
                    FCChartObj.showlimits = pluck(FCChartObj.showyaxislimits, FCChartObj.showlimits, 0);
                    FCChartObj.showdivlinevalues = pluck(FCChartObj.showdivlinevalues, 0);

                    // Forcefully show secondary axis as settings for primary axis
                    // disables the secondary axis too
                    FCChartObj.showdivlinesecondaryvalue = pluck(FCChartObj.showdivlinesecondaryvalue, 1);
                    FCChartObj.showsecondarylimits = pluck(FCChartObj.showsecondarylimits, 1);
                }

                // Hide secondary axis when no data is attached to that axis
                // unless hideEmptyAxis is set to 0 (disabled)
                if (hideEmptyAxis && !isSY) {
                    FCChartObj.showdivlinesecondaryvalue = pluck(FCChartObj.showdivlinesecondaryvalue, 0);
                    FCChartObj.showsecondarylimits = pluck(FCChartObj.showsecondarylimits, 0);
                }

                // Configure the axis
                this.configureAxis(HCObj, FCObj);

                // Process and create trend-lines and tend-zones
                if (FCObj.trendlines) {
                    createTrendLine(FCObj.trendlines, HCObj.yAxis,
                                HCObj[FC_CONFIG_STRING], true, this.isBar);
                }
            }
        }


    };

    // Add the definition to chart structure.
    if (chartAPI.msstackedcolumn2dlinedy) {
        chartAPI('msstackedcombidy2d', msscdy2dlogic, chartAPI.msstackedcolumn2dlinedy);
    }
    else {
        injectModule(CHARTS, 'msstackedcombidy2d', 1); // add charts dependency

        // enqueue definition
        moduleCmdQueue[CHARTS].unshift({
            cmd: '_call',
            obj: win,
            args: [function () {
                if (!chartAPI.msstackedcolumn2dlinedy) {
                    global.raiseError(global.core, '12052314141', 'run',
                        'JavaScriptRenderer~MSStackedCombiDY2D._call()',
                        new Error('FusionCharts.HC.Charts.js is required in order to define vizualization'));
                    return;
                }
                chartAPI('msstackedcombidy2d', msscdy2dlogic, chartAPI.msstackedcolumn2dlinedy);

            }, [], win]
        });
    }

}]);
