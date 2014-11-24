/**!
 * @license FusionCharts JavaScript Library - Gantt Chart
 * Copyright FusionCharts Technologies LLP
 * License Information at <http://www.fusioncharts.com/license>
 *
 * @version 3.4.0
 */
/**
 * @private
 * @module fusioncharts.renderer.javascript.gantt
 * @export fusioncharts.gantt.js
 */
FusionCharts.register('module', ['private', 'modules.renderer.js-gantt', function () {
    var global = this,
        lib = global.hcLib,
        win = global.window,
        userAgent = win.navigator.userAgent,
        isIE = /msie/i.test(userAgent) && !win.opera,
        chartapi = lib.chartAPI,
        renderer = lib.chartAPI,
        extend2 = lib.extend2,
        pluck = lib.pluck,
        pluckNumber = lib.pluckNumber,
        getFirstColor = lib.getFirstColor,
        graphics = lib.graphics,
        convertColor = graphics.convertColor,
        getDarkColor = graphics.getDarkColor,
        parseColor = graphics.parseColor,
        parseUnsafeString = lib.parseUnsafeString,
        getFirstValue = lib.getFirstValue,
        getValidValue = lib.getValidValue,
        R = lib.Raphael,
        COMMA = lib.COMMASTRING,
        setLineHeight = lib.setLineHeight,
        getDashStyle = lib.getDashStyle,
        toRaphaelColor = lib.toRaphaelColor,
        each = lib.each,
        ROLLOVER = 'DataPlotRollOver',
        ROLLOUT = 'DataPlotRollOut',
        CONFIGKEY = lib.FC_CONFIG_STRING,
        BLANK = '',
        TRACKER_FILL = 'rgba(192,192,192,'+ (isIE ? 0.002 : 0.000001) +')', // invisible but clickable
        UNDEF,
        mapSymbolName = graphics.mapSymbolName,

        GUTTER_10 = 10,
        GUTTER_5 = 5,
        math = Math,
        mathCeil = math.ceil,
        mathRound = math.round,
        mathMax = math.max,
        mathMin = math.min,
        mathAbs = math.abs,
        pInt = parseInt,
        toFloat = parseFloat,
        M = 'M',
        L = 'L',
        h = 'h',
        v = 'v',
        H = 'H',
        PX = 'px',
        BOLD = 'bold',
        ITALIC = 'italic',
        NORMAL = 'normal',
        NONE = 'none',
        UND_LINE = 'underline',
        hFs = 'hOffset',
        vFs = 'vOffset',
        stubEvent = {
            pageX: 0,
            pageY: 0
        },
        plotEventHandler = lib.plotEventHandler,
        hoverTimeout,
        lastHoverEle,
        hasTouch = lib.hasTouch = win.document.documentElement.ontouchstart !== undefined,
        DRAGSTART = 'dragstart',
        DRAGEND = 'dragend',
        merge = function() { /** @todo refactor dependency */
            var args = arguments;
            return lib.extend2(lib.extend2(lib.extend2(lib.extend2({}, args[0]), args[1]), args[2]), args[3]);
        },
        addEvent = lib.addEvent,
        removeEvent = lib.removeEvent,

        UNDEFINED,

        defined = function(obj) {
            return obj !== UNDEFINED && obj !== null;
        },
        isPercent = function(srt) {
            return (/%/g).test(srt);
        },
        align = {
            left: 'start',
            right: 'end',
            center: 'middle'
        },
        xAlign = {
            left: 0,
            right: 1,
            center: 0.5,
            'undefined': 0.5
        },
        yAlign = {
            top: 1,
            bottom: 0,
            middle: 0.5,
            'undefined': 0.5
        },
        alignGutter = {
            left: 5,
            right: -5,
            center: 0,
            'undefined': 0
        },
        creditLabel = false && !/fusioncharts\.com$/i.test(win.location.hostname),

        GanttAxis = function (hc, drawingWidth) {
            var T = this;
            T.min = hc.min;
            T.max= pluckNumber(hc.visibleMax, hc.max);
            T.pixelValueRatio = drawingWidth / (T.max - T.min);
            T.startPixel = hc.chart.marginLeft + hc.chart.ganttStartX;
        };
    GanttAxis.prototype = {
        getPixel: function(value) {
            return this.startPixel + ((value - this.min) * this.pixelValueRatio);
        }
    };
    GanttAxis.prototype.constructor = GanttAxis;

    chartapi('gantt', {
        friendlyName: 'Gantt Chart',
        rendererId: 'gantt',
        standaloneInit: true,
        //hasVDivLine : true,
        defaultSeriesType : 'gantt',
        canvasborderthickness: 1,
        defaultPlotShadow: 1,
        creditLabel: creditLabel,

        defaultPaletteOptions : merge(extend2({}, lib.defaultGaugePaletteOptions), {
            //Colors for gauge '339900', 'DD9B02', '943A0A',
            paletteColors:
                [['AFD8F8', 'F6BD0F', '8BBA00', 'FF8E46', '008E8E',
                'D64646', '8E468E', '588526', 'B3AA00', '008ED6', '9D080D',
                'A186BE', 'CC6600', 'FDC689', 'ABA000', 'F26D7D', 'FFF200',
                '0054A6', 'F7941C', 'CC3300', '006600', '663300', '6DCFF6'],
                    ['AFD8F8', 'F6BD0F', '8BBA00', 'FF8E46', '008E8E',
                'D64646', '8E468E', '588526', 'B3AA00', '008ED6', '9D080D',
                'A186BE', 'CC6600', 'FDC689', 'ABA000', 'F26D7D', 'FFF200',
                '0054A6', 'F7941C', 'CC3300', '006600', '663300', '6DCFF6'],
                    ['AFD8F8', 'F6BD0F', '8BBA00', 'FF8E46', '008E8E',
                'D64646', '8E468E', '588526', 'B3AA00', '008ED6', '9D080D',
                'A186BE', 'CC6600', 'FDC689', 'ABA000', 'F26D7D', 'FFF200',
                '0054A6', 'F7941C', 'CC3300', '006600', '663300', '6DCFF6'],
                    ['AFD8F8', 'F6BD0F', '8BBA00', 'FF8E46', '008E8E',
                'D64646', '8E468E', '588526', 'B3AA00', '008ED6', '9D080D',
                'A186BE', 'CC6600', 'FDC689', 'ABA000', 'F26D7D', 'FFF200',
                '0054A6', 'F7941C', 'CC3300', '006600', '663300', '6DCFF6'],
                    ['AFD8F8', 'F6BD0F', '8BBA00', 'FF8E46', '008E8E',
                'D64646', '8E468E', '588526', 'B3AA00', '008ED6', '9D080D',
                'A186BE', 'CC6600', 'FDC689', 'ABA000', 'F26D7D', 'FFF200',
                '0054A6', 'F7941C', 'CC3300', '006600', '663300', '6DCFF6']],
            //Store other colors
            // ------------- For 2D Chart ---------------//
            //We're storing 5 combinations, as we've 5 defined palettes.
            bgColor: ['FFFFFF', 'FFFFFF', 'FFFFFF', 'FFFFFF', 'FFFFFF'],
            bgAngle: [270, 270, 270, 270, 270],
            bgRatio: ['100', '100', '100', '100', '100'],
            bgAlpha: ['100', '100', '100', '100', '100'],
            canvasBgColor: ['FFFFFF', 'FFFFFF', 'FFFFFF', 'FFFFFF', 'FFFFFF'],
            canvasBgAngle: [0, 0, 0, 0, 0],
            canvasBgAlpha: ['100', '100', '100', '100', '100'],
            canvasBgRatio: ['', '', '', '', ''],
            canvasBorderColor: ['545454', '545454', '415D6F', '845001', '68001B'],
            canvasBorderAlpha: [100, 100, 100, 90, 100],
            gridColor: ['DDDDDD', 'D8DCC5', '99C4CD', 'DEC49C', 'FEC1D0'],
            gridResizeBarColor: ['999999', '545454', '415D6F', '845001', 'D55979'],
            categoryBgColor: ['F1F1F1', 'EEF0E6', 'F2F8F9', 'F7F0E6', 'FFF4F8'],
            dataTableBgColor: ['F1F1F1', 'EEF0E6', 'F2F8F9', 'F7F0E6', 'FFF4F8'],
            toolTipBgColor: ['FFFFFF', 'FFFFFF', 'FFFFFF', 'FFFFFF', 'FFFFFF'],
            toolTipBorderColor: ['545454', '545454', '415D6F', '845001', '68001B'],
            baseFontColor: ['555555', '60634E', '025B6A', 'A15E01', '68001B'],
            borderColor: ['767575', '545454', '415D6F', '845001', '68001B'],
            borderAlpha: [50, 50, 50, 50, 50],
            legendBgColor: ['ffffff', 'ffffff', 'ffffff', 'ffffff', 'ffffff'],
            legendBorderColor: ['666666', '545454', '415D6F', '845001', 'D55979'],
            plotBorderColor: ['999999', '8A8A8A', '6BA9B6', 'C1934D', 'FC819F'],
            plotFillColor: ['EEEEEE', 'D8DCC5', 'BCD8DE', 'E9D8BE', 'FEDAE3'],
            scrollBarColor: ['EEEEEE', 'D8DCC5', '99C4CD', 'DEC49C', 'FEC1D0']
        }),

        charttopmargin: 10,
        chartbottommargin: 20,

        // Parse the categories and find the min and max date value
        series: function () {
            var iapi = this,
                definition = iapi.dataObj,
                chartDef = definition.chart,

                categories = (categories = definition.categories) || [],
                catLen = categories.length,

                hc = iapi.hcJSON,
                HCChart = hc.chart,
                conf = hc[CONFIGKEY],
                smartLabel = iapi.smartLabel,
                colorM = iapi.colorManager,

                cat = hc.categories = {},
                data = [],
                inCanStyle = iapi.inCanvasStyle,
                numberFormatter = iapi.numberFormatter,

                dmin = Infinity,
                dmax = -Infinity,
                canvasWidth = HCChart.origW - HCChart.marginLeft - HCChart.marginRight,
                canvasHeight = HCChart.origH - HCChart.marginTop - HCChart.marginBottom,

                processes = definition.processes || {},
                process = processes && processes.process,
                proLen = process && process.length,
                FCDPID = '__FCDPID__',
                inCanFontSize = pInt(inCanStyle.fontSize, 10),

                datatable = definition.datatable,
                datacolumn = datatable && datatable.datacolumn,
                dataColLen = datacolumn && datacolumn.length,

                connectors = definition.connectors,
                connectorsLen = connectors && connectors.length,
                hcConnectors = hc.connectors = [],

                milestone = definition.milestones && definition.milestones.milestone,
                len = milestone && milestone.length,
                hcMilestone = hc.milestone = [],

                tasks = definition.tasks,
                task = tasks && tasks.task,
                taskLen = task && task.length,
                numTasks = 0,

                catUsedHeight = 0,

                forceGanttWidth = pluckNumber(chartDef.forceganttwidthpercent, 0),
                totalGridWidth = 0,
                invalidCounter = 0,
                changeAll = false,
                vAlignMap = {
                    top: 'top',
                    bottom: 'bottom'
                },
                vAlignVal = {
                    top: 'top',
                    bottom: 'bottom',
                    'undefined': 'middle'
                },
                alignMap = {
                    right: 'right',
                    left: 'left'
                },
                alignVal = {
                    right: 'right',
                    left: 'left',
                    'undefined': 'center'
                },
                // Create dataTables store
                dataTable = hc.dataTable = {

                },
                canLeft = 0,

                minDate = Infinity,
                maxDate = -Infinity,

                processIDMap = hc.processIDMap = [],
                HCprocesses = {},
                dInT = pluckNumber(chartDef.dateintooltip, 1),
                legendItm = definition.legend && definition.legend.item,
                tasksMap = hc.tasksMap || (hc.tasksMap = {}),

                toolText,
                hoverC,
                hoverA,
                useHover,
                legObj,
                showSlackAsFill,
                dataColWidth,
                dataWidth,
                smrtTxt,
                maxWidth,
                gridWidth,
                connector,
                connectorLen,
                cnColor,
                cnAlpha,
                cnThickness,
                cnIsDashed,
                connectorsObj,
                connectorObj,
                HCdatacolumns,
                msObj,
                sides,
                taskId,
                taskRadius,
                taskMix,
                taskRatio,
                shape,
                color,
                start,
                end,
                font,
                fontSize,
                fontColor,
                isBold,
                isItalic,
                isUnderline,
                verticalPadding,
                align,
                vAlign,
                label,
                catItemLen,
                categoryItems,
                catObj,
                catsObj,
                category,
                processObj,
        bgColor,
        bgAlpha,
                processWidth,
                datacolumnObj,
                taskObj,
                serializeProcessId,
                prevRowId,
                prevRowCat,
                prevRowObj,
                tAlpha,
                tBorderColor,
                tBorderAlpha,
                arrColor,
                arrAlpha,
                arrRatio,
                fillAngle,
                sDate,
                eDate,
                dataLabel,
                slColor,
                percentComplete,
                tColorObj,
                tHovColor,
                tHovBorderColor,
                slHovColor,
                maxHeight,
                style,
                text,
                textLen,
                textObj,
                id,
                prevId,
                headerId,
                linkedObj,
                dimension,
                depth,
                trend,
                lineArr,
                isTrendZone,
                lineObj,
                processOnRight,
                showFullDT,
                i,
                j;

            if (!proLen) {
                return;
            }

            hc.tasks = [];

            delete hc.yAxis;
            delete hc.xAxis;

            //Canvas Border properties
            HCChart.backgroundColor = convertColor(pluck(chartDef.bgcolor,
                'FFFFFF'), pluck(chartDef.bgalpha,
                colorM.getColor('bgAlpha')));

            if (!pluckNumber(chartDef.showborder, 0)) {
                HCChart.borderWidth = 0;
            }

            HCChart.plotBorderColor = convertColor(pluck(
                    chartDef.canvasbordercolor, colorM.getColor('canvasBorderColor')),
                pluckNumber(chartDef.showcanvasborder, 1) === 0 ?
                0 : pluck(chartDef.canvasborderalpha, 100));

            HCChart.backgroundColor = {
                FCcolor : {
                    color : pluck(chartDef.bgcolor, 'FFFFFF'),
                    alpha : pluck(chartDef.bgalpha, colorM.getColor('bgAlpha')),
                    angle : pluck(chartDef.bgangle, colorM.getColor('bgAngle')),
                    ratio : pluck(chartDef.bgratio, colorM.getColor('bgRatio'))
                }
            };

            HCChart.plotBackgroundColor = {
                FCcolor : {
                    color : pluck(chartDef.canvasbgcolor, colorM.getColor('canvasBgColor')),
                    alpha : pluck(chartDef.canvasbgalpha, colorM.getColor('canvasBgAlpha')),
                    angle : pluck(chartDef.canvasbgangle, colorM.getColor('canvasBgAngle')),
                    ratio : pluck(chartDef.canvasbgratio, colorM.getColor('canvasBgRatio'))
                }
            };

            HCChart.plotBorderWidth = pluckNumber(
                    chartDef.canvasborderthickness, 1);

            //Output date format
            HCChart.outputDateFormat = pluck(chartDef.outputdateformat, HCChart.dateFormat);

            //Whether to extend the last category background till bottom
            HCChart.extendCategoryBg = pluckNumber(chartDef.extendcategorybg, 0);
            //Gantt grid line properties
            HCChart.ganttLineColor = convertColor(pluck(chartDef.ganttlinecolor,
                colorM.getColor('gridColor')), pluckNumber(chartDef.ganttlinealpha, 100));
            HCChart.ganttLineThickness = pluckNumber(chartDef.ganttlinethickness, 1);
            HCChart.ganttLineDashStyle = pluckNumber(chartDef.ganttlinedashed, 0) ?
                getDashStyle(pluckNumber(chartDef.ganttlinedashlen, 1),
                chartDef.ganttlinedashgap, HCChart.ganttLineThickness) : undefined;

            //Grid properties
            HCChart.gridBorderColor = convertColor(pluck(chartDef.gridbordercolor,
                colorM.getColor('gridColor')), pluckNumber(chartDef.gridborderalpha, 100));
            HCChart.gridBorderThickness = pluckNumber(chartDef.gridborderthickness, 1);
            HCChart.gridBorderDashStyle = pluckNumber(chartDef.gridborderdashed, 0) ?
                getDashStyle(pluckNumber(chartDef.gridborderdashlen, 1),
                chartDef.gridborderdashgap, HCChart.gridborderThickness) : undefined;
            //Slack fill color
            HCChart.showSlackAsFill = pluckNumber(chartDef.showslackasfill, 1);
            HCChart.slackFillColor = getFirstColor(pluck(chartDef.slackfillcolor, 'FF5E5E'));
            //Grid resize bar properties
            HCChart.gridResizeBarColor = convertColor(pluck(chartDef.gridresizebarcolor,
                colorM.getColor('gridResizeBarColor')), pluckNumber(chartDef.gridresizebaralpha, 100));
            HCChart.gridResizeBarThickness = pluckNumber(chartDef.gridresizebarthickness, 1);

            //Task round radius
            HCChart.taskBarRoundRadius = pluckNumber(chartDef.taskbarroundradius, 0);
            //Task Bar fill properties
            HCChart.taskBarFillMix = chartDef.taskbarfillmix;
            HCChart.taskBarFillRatio = chartDef.taskbarfillratio;
            //Set defaults
            if (HCChart.taskBarFillMix === undefined) {
                HCChart.taskBarFillMix = '{light-10},{dark-20},{light-50},{light-85}';
            }
            if (HCChart.taskBarFillRatio === undefined) {
                HCChart.taskBarFillRatio = '0,8,84,8';
            }
            //Connector extension
            HCChart.connectorExtension = pluckNumber(chartDef.connectorextension, 10);
            //Click URL
            HCChart.clickURL = pluck(chartDef.clickurl, BLANK);
            //Delay in rendering annotations that are over the chart
            HCChart.annRenderDelay = chartDef.annrenderdelay;

            HCChart.taskDatePadding = pluckNumber(chartDef.taskdatepadding, 3);
            HCChart.taskLabelPadding = pluckNumber(chartDef.tasklabelspadding, 2);


            HCChart.ganttStartX = pluckNumber(chartDef.ganttwidthpercent, 65);
            //Cannot be more than 100
            if (HCChart.ganttStartX > 100) {
                HCChart.ganttStartX = 100;
            }
            //Calculate the user specified grid width in pixels
            gridWidth = HCChart.ganttStartX = (100 - HCChart.ganttStartX) *
                    0.01 * canvasWidth;
            HCChart.gridWidth = canvasWidth - HCChart.ganttStartX;

            showFullDT = pluckNumber(chartDef.showfulldatatable, 1);

            // Find the width for processes and dataTables
            processWidth = processes.width;
            processWidth = pluckNumber(HCChart.ganttStartX *
                    (/\%/g.test(processWidth) && toFloat(processWidth, 10) *
                    0.01) || processWidth);
            gridWidth -= pluckNumber(processWidth, 0);
            HCprocesses.width = mathRound(processWidth);
            invalidCounter += 1;

            for (i = 0; i < dataColLen; i += 1) {
                dataColWidth = datacolumn[i].width;
                dataWidth = pluckNumber(HCChart.ganttStartX *
                    (/\%/g.test(dataColWidth) && toFloat(dataColWidth, 10) *
                    0.01) || dataColWidth);
                gridWidth -= pluckNumber(dataWidth, 0);
                //dataColWidth = mathRound(dataWidth);
                dataWidth = datacolumn[i].width = mathRound(dataWidth);
                //isNaN(dataWidth) && invalidCounter++;
                invalidCounter += 1;
            }

            if (gridWidth >= 0) {
                gridWidth = gridWidth / invalidCounter;
            } else {
                changeAll = true;
                gridWidth = HCChart.ganttStartX / invalidCounter;
            }

            if (forceGanttWidth || !showFullDT) {
                (isNaN(HCprocesses.width) || changeAll) && (HCprocesses.width = gridWidth);
                for (i = 0; i < dataColLen; i += 1) {
                    (isNaN(datacolumn[i].width) || changeAll) &&
                        (datacolumn[i].width = gridWidth);
                }
            }

            // Categories
            for (i = 0; i < catLen; i += 1) {
                catsObj = categories[i];

                dmin = Infinity;
                dmax = -Infinity;

                bgColor = pluck(catsObj.bgcolor, colorM.getColor('categoryBgColor'));
                bgAlpha = pluckNumber(catsObj.bgalpha, 100);
                font = pluck(catsObj.font, inCanStyle.fontFamily);
                fontSize = pluckNumber(catsObj.fontsize, inCanFontSize + 1);
                fontColor = pluck(catsObj.fontcolor, inCanStyle.color);
                isBold = pluckNumber(catsObj.isbold, 1);
                isItalic = pluckNumber(catsObj.isitalic, 0);
                isUnderline = pluckNumber(catsObj.isunderline, 0);
                verticalPadding = pluckNumber(catsObj.verticalpadding, 3);
                align = pluck(catsObj.align, 'center').toLowerCase();
                vAlign = pluck(catsObj.valign, 'middle').toLowerCase();

                categoryItems = catsObj.category;
                catItemLen = categoryItems && categoryItems.length;
                maxHeight = 0;
                dimension = {};

                for (j = 0; j < catItemLen; j += 1) {
                    catObj = categoryItems[j];
                    start = numberFormatter.getDateValue(catObj.start).ms;
                    end = numberFormatter.getDateValue(catObj.end).ms;
                    category = null;

                    // Find the min and max value from categories
                    if (isNaN(start)) { /** @todo nan check without fn call */
                        start = UNDEF;
                    }
                    if (start > dmax) { dmax = start; }
                    if (start <= dmin) { dmin = start; }

                    if (isNaN(end)) { /** @todo nan check without fn call */
                        end = UNDEF;
                    }
                    if (end > dmax) { dmax = end; }
                    if (end <= dmin) { dmin = end; }

                    label = parseUnsafeString(pluck(catObj.label, catObj.name));
                    style = {
                        color: getFirstColor(pluck(catObj.fontcolor, fontColor)),
                        fontFamily: pluck(catObj.font, font),
                        fontSize: pluckNumber(catObj.fontsize, fontSize) + PX,
                        fontWeight: pluckNumber(catObj.isbold, isBold) && BOLD || NORMAL,
                        fontStyle: pluckNumber(catObj.isitalic, isItalic) && ITALIC || NORMAL,
                        textDecoration: pluckNumber(catObj.isunderline, isUnderline) && UND_LINE || NONE
                    };
                    setLineHeight(style);
                    smartLabel.setStyle(style);
                    smrtTxt = smartLabel.getOriSize(label);
                    maxHeight = mathMax(maxHeight, smrtTxt.height);
                    id = 'FCCAT_' + i + '_' + j;

                    hoverC = pluck(catObj.hoverbandcolor, catsObj.hoverbandcolor,
                        chartDef.categoryhoverbandcolor, chartDef.hoverbandcolor,
                        colorM.getColor('gridColor'));
                    hoverA = pluckNumber(catObj.hoverbandalpha, catsObj.hoverbandalpha,
                        chartDef.categoryhoverbandalpha, chartDef.hoverbandalpha, 30);
                    useHover = pluckNumber(catObj.showhoverband, catsObj.showhoverband,
                        chartDef.showcategoryhoverband, chartDef.showhoverband,
                        chartDef.showhovereffect, 1);

                    cat[id] = {
                        text: label,
                        style: style,
                        start: start,
                        end: end,
                        index: j,
                        isLast: (i === catLen - 1),
                        bgColor: convertColor(pluck(catObj.bgcolor,
                            bgColor), pluckNumber(catObj.bgalpha, bgAlpha)),
                        dimension: dimension,
                        link: catObj.link,
                        align: alignVal[[pluck(catObj.align, align).toLowerCase()]],
                        vAlign: vAlignVal[vAlignMap[pluck(catObj.valign, vAlign).toLowerCase()]],
                        hoverColor: convertColor(hoverC, hoverA),
                        useHover: useHover,
                        usePlotHover: pluckNumber(catObj.showganttpanehoverband,
                            catsObj.showganttpanehoverband, chartDef.showganttpaneverticalhoverband,
                            useHover)
                    };

                    if (cat[prevId]) {
                        cat[prevId].nextCol = cat[id];
                        cat[id].prevCol = cat[prevId];
                    }

                    prevId = id;
                }
                prevRowCat = cat['FCCAT_' + i + '_' + 0];

                if (prevRowCat) {
                    cat[id].first = prevRowCat;
                    prevRowCat.last = cat[id];

                    if (cat[prevRowId]) {
                        cat[prevRowId].nextRow =  prevRowCat;
                        prevRowCat.prevRow = cat[prevRowId];
                    }
                }
                prevRowId = id;

                dimension.h = maxHeight + GUTTER_5 + (pluckNumber(catsObj.verticalpadding, 3) * 2);
                dimension.y = catUsedHeight;
                dimension.min = dmin;
                dimension.max = dmax;
                dimension.numCat = j;
                catUsedHeight += dimension.h;

                // Find the min and max value from whole categories
                maxDate = mathMax(maxDate, dmax);
                minDate = mathMin(minDate, dmin);
            }

            cat.min = minDate;
            cat.max = maxDate;

            // Processes
            if (proLen) {
                maxHeight = maxWidth = 0;
                //Position of the process name column in the data grid.
                processOnRight = pluck(processes.positioningrid,
                    'left').toLowerCase() === 'right';
                style = {
                    color: getFirstColor(pluck(processes.headerfontcolor, inCanStyle.color)),
                    fontFamily: pluck(processes.headerfont, inCanStyle.fontFamily),
                    fontSize: pluckNumber(processes.headerfontsize, inCanFontSize + 3) + PX,
                    fontWeight: pluckNumber(processes.headerisbold, 1) && BOLD || NORMAL,
                    fontStyle: pluckNumber(processes.headerisitalic, 0) && ITALIC || NORMAL,
                    textDecoration: pluckNumber(processes.headerisunderline, 0) && UND_LINE || NONE
                };
                setLineHeight(style);
                label = parseUnsafeString(processes.headertext);
                smartLabel.setStyle(style);
                smrtTxt = smartLabel.getOriSize(label);
                maxWidth = mathMax(maxWidth, smrtTxt.width);

                align = alignVal[alignMap[pluck(processes.headeralign,
                        'center').toLowerCase()]];
                vAlign = vAlignVal[vAlignMap[pluck(processes.headervalign,
                        'middle').toLowerCase()]];

                dimension = {
                };
                id = headerId = prevRowId = 'processHeader';
                // Taking max line height
                dataTable.processHeader = {
                    text: label,
                    style: style,
                    align: align,
                    vAlign: vAlign,
                    isHeader: true,
                    link: pluck(processes.headerlink),
                    dimension: {
                        x: canLeft,
                        w: 0,
                        h: mathMax(smrtTxt.height, catUsedHeight)
                    },
                    bgColor: convertColor(pluck(processes.headerbgcolor,
                        colorM.getColor('dataTableBgColor')), pluckNumber(
                                processes.headerbgalpha, 100)),
                    key: id,
                    isLast: processOnRight,
                    drawResizer: !processOnRight && dataColLen,
                    prevCol: null,
                    nextCol: null,
                    prevRow: null,
                    nextRow: null
                };
                //HCprocesses.headerHeight += GUTTER_10;

                //Other properties
                bgColor = pluck(processes.bgcolor, colorM.getColor('dataTableBgColor'));
                bgAlpha= pluckNumber(processes.bgalpha, 100);
                font = pluck(processes.font, inCanStyle.fontFamily);
                fontSize = pluckNumber(processes.fontsize, inCanFontSize);
                fontColor = pluck(processes.fontcolor, inCanStyle.color);
                isBold = pluckNumber(processes.isbold, 0);
                isItalic = pluckNumber(processes.isitalic, 0);
                isUnderline = pluckNumber(processes.isunderline, 0);
                align = pluck(processes.align, 'center').toLowerCase();
                vAlign = pluck(processes.valign, 'middle').toLowerCase();

                for (i = 0; i < proLen; i += 1) {
                    processObj = process[i];
                    hoverC = pluck(processObj.hoverbandcolor, processes.hoverbandcolor,
                        chartDef.processhoverbandcolor, chartDef.hoverbandcolor,
                        colorM.getColor('gridColor'));
                    hoverA = pluckNumber(processObj.hoverbandalpha,
                        processes.hoverbandalpha, chartDef.processhoverbandalpha,
                        chartDef.hoverbandalpha, 30);
                    useHover = pluckNumber(processObj.showhoverband,
                        processes.showhoverband, chartDef.showprocesshoverband,
                         chartDef.showhoverband, chartDef.showhovereffect, 1);
                    style = {
                        color: getFirstColor(pluck(processObj.fontcolor, fontColor)),
                        fontSize: pluckNumber(processObj.fontsize, fontSize) + PX,
                        fontFamily: pluck(processObj.font, font),
                        fontWeight: pluckNumber(processObj.isbold, isBold) && BOLD || NORMAL,
                        fontStyle: pluckNumber(processObj.isitalic, isItalic) && ITALIC || NORMAL,
                        textDecoration: pluckNumber(processObj.isunderline, isUnderline) && UND_LINE || NONE
                    };
                    setLineHeight(style);
                    label = parseUnsafeString(pluck(processObj.label, processObj.name));
                    // Find the max line height in process label text
                    smartLabel.setStyle(style);
                    smrtTxt = smartLabel.getOriSize(label);
                    maxHeight = mathMax(maxHeight, smrtTxt.height);
                    maxWidth = mathMax(maxWidth, smrtTxt.width);

                    prevId = id;
                    id = pluck(processObj.id, FCDPID + i).toUpperCase();
                    // If user given ID already exist
                    if (dataTable[id]) {
                        id = (FCDPID + i);
                    }
                    processIDMap[i] = id;

                    //Process name attributes
                    dataTable[id] = {
                        text: smrtTxt.text,
                        style: style,
                        link: processObj.link,
                        id: id,
                        align: alignVal[[pluck(processObj.align, align).toLowerCase()]],
                        vAlign: vAlignVal[vAlignMap[pluck(processObj.valign, vAlign).toLowerCase()]],
                        bgColor: convertColor(pluck(processObj.bgcolor, bgColor),
                            pluckNumber(processObj.bgalpha, bgAlpha)),
                        prevCol: dataTable[prevId],
                        dimension: dimension,
                        hoverColor: convertColor(hoverC, hoverA),
                        useHover: useHover,
                        usePlotHover: pluckNumber(processObj.showganttpanehoverband,
                            processes.showganttpanehoverband,
                            chartDef.showganttpanehorizontalhoverband, useHover),
                        isLast: processOnRight,
                        nextCol: null,
                        prevRow: null,
                        nextRow: null
                    };

                    dataTable[prevId] && (dataTable[prevId].nextCol = dataTable[id]);
                }
                dataTable[id].first = dataTable[headerId];
                dataTable[headerId].last = dataTable[id];
                dataTable[headerId].processCount = proLen;
                dataTable[headerId].maxProcessHeight = maxHeight + 8;

                HCprocesses.height = maxHeight + 8;
                //HCprocesses.processWidth = forceGanttWidth ? processWidth : maxWidth;
                isNaN(HCprocesses.width) && (HCprocesses.width = maxWidth  + GUTTER_10);
                totalGridWidth += HCprocesses.width;
                dimension.x = canLeft;
                dataTable[headerId].dimension.w = dimension.w = HCprocesses.width;
                dimension.h = HCprocesses.height = mathMax((canvasHeight -
                    dataTable[headerId].dimension.h) / proLen, HCprocesses.height);
            }

            processOnRight &&  (totalGridWidth = 0);

            // Datatable
            if (dataColLen) {
                hc.datacolumns = [];

                for (i = 0; i < dataColLen; i += 1) {
                    //Header properties
                    datacolumnObj = datacolumn[i];
                    maxWidth = 0;
                    // Datatable
                    // Extract the attributes of DATATABLE
                    bgColor = getFirstColor(pluck(datacolumnObj.bgcolor,
                        datatable.bgcolor, colorM.getColor('dataTableBgColor')));
                    bgAlpha = pluckNumber(datacolumnObj.bgalpha,
                        datatable.bgalpha, 100);
                    font = pluck(datacolumnObj.font, datatable.font,
                        inCanStyle.fontFamily);
                    fontColor = getFirstColor(pluck(datacolumnObj.fontcolor,
                        datatable.fontcolor, inCanStyle.color));
                    fontSize = pluckNumber(datacolumnObj.fontsize,
                        datatable.fontsize, inCanFontSize);
                    isBold = pluckNumber(datacolumnObj.isbold,
                        datatable.isbold, 0);
                    isItalic = pluckNumber(datacolumnObj.isitalic,
                        datatable.isitalic, 0);
                    isUnderline = pluckNumber(datacolumnObj.isunderline,
                        datatable.isunderline, 0);
                    align = alignVal[alignMap[pluck(datacolumnObj.align,
                        datatable.align, 'center').toLowerCase()]];
                    vAlign = vAlignVal[vAlignMap[pluck(datacolumnObj.valign,
                        datatable.valign, 'middle').toLowerCase()]];

                    style = {
                        color: getFirstColor(pluck(datacolumnObj.headerfontcolor,
                            datatable.headerfontcolor, fontColor)),
                        fontFamily: pluck(datacolumnObj.headerfont,
                            datatable.headerfont, font),
                        fontSize: pluckNumber(datacolumnObj.headerfontsize,
                            datatable.headerfontsize, fontSize + 3) + PX,
                        fontWeight: pluckNumber(datacolumnObj.headerisbold,
                            datatable.headerisbold, 1) && BOLD || NORMAL,
                        fontStyle: pluckNumber(datacolumnObj.headerisitalic,
                            datatable.headerisitalic, isItalic) && ITALIC || NORMAL,
                        textDecoration: pluckNumber(datacolumnObj.headerisunderline,
                            datatable.headerisunderline, isUnderline) && UND_LINE || NONE
                    };
                    setLineHeight(style);
                    label = parseUnsafeString(datacolumnObj.headertext);
                    smartLabel.setStyle(style);
                    smrtTxt = smartLabel.getOriSize(label);
                    maxWidth = mathMax(maxWidth, smrtTxt.width);

                    id = headerId = '_FCDtHeader_' + i;

                    HCdatacolumns = dataTable[id] = {
                        //Header text for the column
                        text: label,
                        style: style,
                        align: alignVal[alignMap[pluck(datacolumnObj.headeralign,
                            datatable.headeralign, align).toLowerCase()]],
                        vAlign: vAlignVal[vAlignMap[pluck(datacolumnObj.headervalign,
                            datatable.headervalign, vAlign).toLowerCase()]],
                        link: pluck(datacolumnObj.headerlink),
                        drawResizer: processOnRight || i < dataColLen - 1,
                        dimension: {
                            x: canLeft + totalGridWidth,
                            w: datacolumnObj.width,
                            h: dataTable.processHeader &&
                                dataTable.processHeader.dimension.h
                        },
                        isHeader: true,
                        key: id,
                        bgColor: convertColor(pluck(datacolumnObj.headerbgcolor,
                            datatable.headerbgcolor, colorM.getColor('dataTableBgColor')), pluckNumber(
                            datacolumnObj.headerbgalpha, datatable.headerbgalpha, 100))
                    };

                    HCdatacolumns.data = [];

                    text = datacolumnObj.text || [];
                    textLen = text && text.length;

                    linkedObj = dataTable.processHeader;
                    prevRowObj = dataTable[prevRowId];
                    prevRowObj.nextRow = dataTable[id];
                    dataTable[id].prevRow = prevRowObj;
                    linkedObj = linkedObj.nextCol;
                    prevRowObj = prevRowObj.nextCol;
                    dimension = {};

                    prevRowId = headerId;
                    for (j = 0; linkedObj; linkedObj = linkedObj.nextCol,
                            prevRowObj = prevRowObj.nextCol, j += 1) {
                        prevId = id;
                        id = '_FCDt_' + i + '_' + j;
                        if (textObj = text[j]) {
                            style = {
                                fontFamily: pluck(textObj.font, font),
                                color: getFirstColor(pluck(textObj.fontcolor,
                                    fontColor)),
                                fontSize: pluckNumber(textObj.fontsize,
                                    fontSize) + PX,
                                fontWeight: pluckNumber(textObj.isbold, isBold) && BOLD || NORMAL,
                                fontStyle: pluckNumber(textObj.isitalic, isItalic) && ITALIC || NORMAL,
                                textDecoration: pluckNumber(textObj.isunderline,
                                    isUnderline) && UND_LINE || NONE
                            };
                            setLineHeight(style);
                            smartLabel.setStyle(style);
                            label = parseUnsafeString(textObj.label);
                            smrtTxt = smartLabel.getOriSize(label);
                            maxWidth = mathMax(maxWidth, smrtTxt.width);
                            dataTable[id] = {
                                text: label,
                                style: style,
                                //clabel: pluck(textObj.label, BLANK),
                                link: pluck(textObj.link, BLANK),
                                bgColor: convertColor(pluck(textObj.bgcolor,
                                    bgColor), pluckNumber(textObj.bgalpha, bgAlpha)),
                                align: alignVal[alignMap[pluck(textObj.align, align).toLowerCase()]],
                                vAlign: vAlignVal[vAlignMap[pluck(textObj.valign, vAlign).toLowerCase()]],
                                prevCol: dataTable[prevId],
                                dimension: dimension,
                                nextCol: null,
                                nextRow: null,
                                prevRow: null
                            };

                        } else {
                            dataTable[id] = {
                                prevCol: dataTable[prevId],
                                dimension: dimension,
                                isNaN: true,
                                nextCol: null,
                                nextRow: null,
                                prevRow: null
                            };
                        }
                        dataTable[prevId].nextCol = dataTable[id];
                        dataTable[id].prevRow = prevRowObj;
                        prevRowObj.nextRow = dataTable[id];

                        dataTable[id].hoverColor =
                            dataTable[processIDMap[j]].hoverColor;
                        dataTable[id].useHover =
                            dataTable[processIDMap[j]].useHover;
                        dataTable[id].usePlotHover =
                            dataTable[processIDMap[j]].usePlotHover;
                    }

                    //dataTable[id].nextCol = dataTable[id];
                    dataTable[id].first = dataTable[headerId];
                    dataTable[headerId].last = dataTable[id];

                    if (isNaN(datacolumnObj.width)) {
                        HCdatacolumns.width = maxWidth + GUTTER_10;
                    } else {
                        HCdatacolumns.width = datacolumnObj.width;
                    }
                    dimension.x = canLeft + totalGridWidth;
                    totalGridWidth += dataTable[headerId].dimension.w =
                        dimension.w = HCdatacolumns.width;
                    dimension.h = HCprocesses.height;
                    hc.datacolumns.push(HCdatacolumns);
                } // End of for
            }

            if (processOnRight) {
                processObj = dataTable.processHeader;
                processObj.dimension.x =
                    processObj.nextCol.dimension.x = totalGridWidth;
                totalGridWidth += HCprocesses.width;
            }

            if (!forceGanttWidth) {
                HCChart.ganttStartX = mathMin(HCChart.ganttStartX,
                    totalGridWidth);
            }
            HCChart.totalGridWidth = totalGridWidth;

            // Trendlines
            trend = definition.trendlines || {};
            hc.trendlines = [];

            for (i = 0; i < trend.length; i += 1) {
                lineArr = trend[i].line;
                len = lineArr && lineArr.length;
                for (j = 0; j < len; j += 1) {
                    lineObj = lineArr[j];
                    isTrendZone = pluckNumber(lineObj.istrendzone, 0);
                    color = pluck(lineObj.color, colorM.getColor('legendBorderColor'));
                    style = extend2({}, conf.trendStyle);
                    style.color = convertColor(color);
                    setLineHeight(style);
                    hc.trendlines.push({
                        start: numberFormatter.getDateValue(lineObj.start).ms,
                        end: numberFormatter.getDateValue(lineObj.end).ms,
                        displayValue: parseUnsafeString(pluck(lineObj.displayvalue,
                            lineObj.start)),
                        color: convertColor(color, pluckNumber(lineObj.alpha,
                            isTrendZone ? 40 : 99)),
                        style: style,
                        isTrendZone: isTrendZone,
                        dashedStyle: pluckNumber(lineObj.dashed, 0) ?
                            getDashStyle(pluckNumber(lineObj.dashlen, 3),
                                pluckNumber(lineObj.dashgap, 3), pluckNumber(lineObj.thickness, 1)) : undefined,
                        thickness: pluckNumber(lineObj.thickness, 1)
                    });
                }
            }

            // Tasks
            if (taskLen) {

                dmin = Infinity;
                dmax = -Infinity;

                //Task round radius
                taskRadius = pluckNumber(chartDef.taskbarroundradius, 0);
                //Task Bar fill properties
                taskMix = chartDef.taskbarfillmix;
                taskRatio = chartDef.taskbarfillratio;
                //Set defaults
                if (taskMix === undefined) {
                    taskMix = '{light-10},{dark-20},{light-50},{light-85}';
                }
                if (taskRatio === undefined) {
                    taskRatio = '0,8,84,8';
                }

                HCChart.shadow = pluckNumber(chartDef.showshadow, 1);
                showSlackAsFill = pluckNumber(chartDef.showslackasfill, 1);

                for (i = 0; i < taskLen; i += 1) {
                    taskObj = task[i];
                    serializeProcessId = numTasks % proLen;
                    start = numberFormatter.getDateValue(taskObj.start).ms;
                    end = numberFormatter.getDateValue(taskObj.end).ms;
                    id = pluck(dataTable[getFirstValue(taskObj.processid, BLANK).toUpperCase()],
                        dataTable[FCDPID + serializeProcessId],
                        dataTable[processIDMap[serializeProcessId]]).id.toUpperCase();

                    tAlpha = pluckNumber(taskObj.alpha, tasks.alpha, 100);
                    color = pluck(taskObj.color, tasks.color, colorM.getColor('plotFillColor'));
                    tBorderAlpha = pluckNumber(taskObj.borderalpha, tasks.borderalpha, 100);
                    tBorderColor = pluck(taskObj.bordercolor, tasks.bordercolor, colorM.getColor('plotBorderColor'));

                    // Find the min and max value from categories
                    if (isNaN(start)) { /** @todo nan check without fn call */
                        start = UNDEF;
                    }
                    if (start > dmax) { dmax = start; }
                    if (start <= dmin) { dmin = start; }

                    if (isNaN(end)) { /** @todo nan check without fn call */
                        end = UNDEF;
                    }
                    if (end > dmax) { dmax = end; }
                    if (end <= dmin) { dmin = end; }

                    style = {
                        color: getFirstColor(pluck(taskObj.fontcolor,
                            tasks.fontcolor, inCanStyle.color)),
                        fontSize: pluckNumber(taskObj.fontsize, tasks.fontsize,
                            inCanFontSize) + PX,
                        fontFamily: pluck(taskObj.font, tasks.font,
                            inCanStyle.fontFamily)
                    };
                    setLineHeight(style);

                    numTasks += 1;

                    //Parse the task color, ratio & alpha
                    arrColor = colorM.parseColorMix(color, taskMix);
                    arrAlpha = colorM.parseAlphaList(tAlpha.toString(), arrColor.length);
                    arrRatio = colorM.parseRatioList(taskRatio, arrColor.length);
                    fillAngle = pluckNumber(taskObj.angle, tasks.angle, 270);

                    //Slack fill color
                    slColor = colorM.parseColorMix(pluck(taskObj.slackfillcolor,
                                tasks.slackfillcolor, chartDef.slackfillcolor,
                        'FF5E5E'), taskMix);


                    percentComplete = mathMin(pluckNumber(taskObj.percentcomplete, -1), 100);

                    label = getFirstValue(pluck(taskObj.label, taskObj.name), BLANK);
                    dataLabel = BLANK;
                    if (pluckNumber(taskObj.showlabel, taskObj.showname,
                        tasks.showlabels, tasks.showname,
                        chartDef.showtasklabels, chartDef.showtasknames, 0)) {
                        dataLabel = label;
                    }
                    if (pluckNumber(taskObj.showpercentlabel, tasks.showpercentlabel,
                            chartDef.showpercentlabel, 0) && percentComplete !== -1) {
                        dataLabel += ' ' + percentComplete + '%';
                    }

                    tColorObj = {
                        FCcolor: {
                            color: arrColor.join(),
                            alpha: arrAlpha,
                            ratio: arrRatio,
                            angle: fillAngle
                        }
                    };

                    slColor = showSlackAsFill ? {
                        FCcolor: {
                            color: slColor.join(),
                            alpha: arrAlpha,
                            ratio: arrRatio,
                            angle: fillAngle
                        }
                    } : TRACKER_FILL;

                    tHovColor = {
                        FCcolor: {
                            color: colorM.parseColorMix(pluck(taskObj.hoverfillcolor,
                                tasks.hoverfillcolor, chartDef.taskhoverfillcolor,
                                getDarkColor(color, 80)), taskMix).join(),
                            alpha: colorM.parseAlphaList(pluck(taskObj.hoverfillalpha,
                                tasks.hoverfillalpha, chartDef.taskhoverfillalpha,
                                tAlpha).toString(), arrColor.length),
                            ratio: arrRatio,
                            angle: fillAngle
                        }
                    };

                    tHovBorderColor = convertColor(pluck(taskObj.hoverbordercolor,
                        tasks.hoverbordercolor, chartDef.taskhoverbordercolor,
                        getDarkColor(tBorderColor, 80)), pluck(taskObj.hoverborderalpha,
                        tasks.hoverborderalpha, chartDef.taskhoverborderalpha,
                        tBorderAlpha));

                    slHovColor = showSlackAsFill ? {
                        FCcolor: {
                            color: colorM.parseColorMix(getDarkColor(pluck(taskObj.slackhoverfillcolor,
                                tasks.slackhoverfillcolor, chartDef.slackhoverfillcolor,
                                chartDef.slackfillcolor, 'FF5E5E'), 80), taskMix).join(),
                            alpha: colorM.parseAlphaList(pluck(taskObj.slackhoverfillalpha,
                                tasks.slackhoverfillalpha, chartDef.slackhoverfillalpha,
                                tAlpha).toString(), arrColor.length),
                            ratio: arrRatio,
                            angle: fillAngle
                        }
                    } : TRACKER_FILL;

                    sDate = numberFormatter.getFormattedDate(start);
                    eDate = numberFormatter.getFormattedDate(end);

                    toolText = getValidValue(parseUnsafeString(pluck(
                        taskObj.tooltext, taskObj.hovertext, tasks.plottooltext,
                        conf.tooltext)));
                    if (toolText !== undefined) {
                        toolText = lib.parseTooltext(toolText, [3,28,29,30,31], {
                            end: eDate,
                            start: sDate,
                            label: label,
                            percentComplete: percentComplete !== -1 ?
                                numberFormatter.percentValue(percentComplete) : BLANK,
                            processName: dataTable[id] && dataTable[id].text
                        }, taskObj);
                    }
                    else {
                        toolText = ((label !== BLANK) ?
                            (label + (dInT ? ', ' : BLANK)) : BLANK) +
                            (dInT ? (sDate + ' - ' + eDate) : BLANK);
                    }
                    taskId = getFirstValue(taskObj.id, BLANK).toUpperCase();

                    tasksMap[getFirstValue(taskId, i)] = {
                        dataObj: {
                            processId: id,
                            label: dataLabel,
                            labelAlign: alignVal[[pluck(taskObj.labelalign, chartDef.tasklabelsalign,
                                'center').toLowerCase()]],
                            link: taskObj.link,
                            start: start,
                            end: end,
                            id: getFirstValue(taskObj.id, BLANK).toUpperCase(),
                            showAsGroup: pluckNumber(taskObj.showasgroup, 0),
                            animation: pluckNumber(taskObj.animation,
                                    chartDef.animation, chartDef.defaultanimation, 1),
                            style: style,
                            percentComplete: percentComplete,
                            color: toRaphaelColor(tColorObj),
                            slackColor: toRaphaelColor(slColor),
                            hoverFillColor: toRaphaelColor(tHovColor),
                            hoverBorderColor: tHovBorderColor,
                            slackHoverColor: toRaphaelColor(slHovColor),
                            showHoverEffect: pluckNumber(taskObj.showhovereffect,
                                    tasks.showhovereffect, chartDef.showtaskhovereffect,
                                    chartDef.showhovereffect, 1),
                            shadow: {
                                opacity: mathMax(tAlpha, tBorderAlpha) / 100,
                                inverted: true
                            },
                            borderColor: convertColor(tBorderColor,
                                    tBorderAlpha),
                            borderThickness: pluckNumber(taskObj.showborder,
                                    tasks.showborder, 1) ? pluckNumber(taskObj.borderthickness,
                                    tasks.borderthickness, 1) : 0,
                            height: pluck(taskObj.height, '35%'),
                            topPadding: pluck(taskObj.toppadding, '35%'),
                            showPercentLabel: pluckNumber(taskObj.showpercentlabel,
                                    tasks.showpercentlabel, chartDef.showpercentlabel, 0),
                            startDate: pluckNumber(taskObj.showstartdate,
                                    tasks.showstartdate, chartDef.showtaskstartdate) ? sDate : UNDEF,
                            endDate: pluckNumber(taskObj.showenddate,
                                    tasks.showenddate, chartDef.showtaskenddate) ? eDate : UNDEF,
                            toolText: toolText,
                            _start: taskObj.start,
                            _end: taskObj.end,
                            _formatSDate: sDate, // to be use by milestone and connector tooltip macro
                            _formatEDate: eDate, // to be use by milestone and connector tooltip macro
                            _label: label // to be use by milestone and connector tooltip macro
                        }
                    };

                    data.push(tasksMap[getFirstValue(taskId, i)].dataObj);
                }

                // Find the min and max value from categories
                maxDate = mathMax(maxDate, dmax);
                minDate = mathMin(minDate, dmin);
            }

            hc.series.push({
                showInLegend: false,
                data: data
            });

            // Milestone
            len = milestone && milestone.length;
            for (i = 0; i < len; i += 1) {
                msObj = milestone[i];
                taskId = getFirstValue(msObj.taskid, BLANK).toUpperCase();
                shape = pluck(msObj.shape, 'polygon').toLowerCase();

                sides = pluckNumber(msObj.numsides, 5);
                //Restrict
                //shape = (shape == 'star') ? shape : mapSymbolName(sides);
                depth = 0;
                if (shape === 'star') {
                    depth = 0.4;
                } else {
                    shape = mapSymbolName(sides);
                    shape = mapSymbolName(sides).split('-')[0];
                }

                color = pluck(msObj.color, colorM.getColor('legendBorderColor'));

                toolText = getValidValue(parseUnsafeString(pluck(msObj.tooltext,
                    msObj.hovertext, chartDef.milestonetooltext)));

                if (toolText !== undefined && tasksMap[taskId]) {
                    taskObj = tasksMap[taskId].dataObj;
                    toolText = lib.parseTooltext(toolText, [28,32,33,34,35,36], {
                        date: numberFormatter.getFormattedDate(msObj.date),
                        taskStartDate: taskObj._formatSDate,
                        taskEndDate: taskObj._formatEDate,
                        taskLabel: taskObj._label,
                        taskPercentComplete: taskObj.percentComplete !== -1 ?
                            numberFormatter.percentValue(taskObj.percentComplete) : BLANK,
                        processName: dataTable[taskObj.processId] && dataTable[taskObj.processId].text
                    }, msObj);
                }
                else {
                    toolText = numberFormatter.getFormattedDate(msObj.date);
                }

                hcMilestone.push({
                    numSides: sides,
                    startAngle: pluckNumber(msObj.startangle, 90),
                    radius: msObj.radius,
                    origDate: msObj.date,
                    date: numberFormatter.getDateValue(msObj.date),
                    fillColor: getFirstColor(color),
                    fillAlpha: pluckNumber(msObj.fillalpha, msObj.alpha, 100) * 0.01,
                    borderColor: getFirstColor(pluck(msObj.bordercolor, color)),
                    borderAlpha: pluckNumber(msObj.borderalpha, msObj.alpha, 100) * 0.01,

                    hoverFillColor: getFirstColor(pluck(msObj.hoverfillcolor,
                        chartDef.milestonehoverfillcolor, getDarkColor(color, 80))),
                    hoverFillAlpha: pluckNumber(msObj.hoverfillalpha,
                        chartDef.milestonehoverfillalpha, msObj.fillalpha,
                        msObj.alpha, 100) * 0.01,
                    hoverBorderColor: getFirstColor(pluck(msObj.hoverbordercolor,
                        chartDef.milestonehoverbordercolor,
                        getDarkColor(pluck(msObj.bordercolor, color), 80))),
                    hoverBorderAlpha: pluckNumber(msObj.hoverborderalpha,
                        chartDef.milestonehoverborderalpha, msObj.borderalpha,
                        msObj.alpha, 100) * 0.01,
                    showHoverEffect: pluckNumber(msObj.showhovereffect,
                        chartDef.showmilestonehovereffect, chartDef.showhovereffect, 1),

                    depth: depth,
                    taskId: taskId,
                    borderThickness: pluckNumber(msObj.borderthickness, 1),
                    link: msObj.link,
                    toolText: toolText
                });
            }

            // Connectors
            for (i = 0; i < connectorsLen; i += 1) {
                connectorsObj = connectors[i];
                connector = connectorsObj && connectorsObj.connector;
                connectorLen = connector && connector.length;
                // Connectors
                if (connectorLen) {
                    for (j = 0; j < connectorLen; j += 1) {
                        connectorObj = connector[j];

                        // Extract the attributes
                        cnColor = pluck(connectorObj.color, connectorsObj.color, colorM.getColor('plotBorderColor'));
                        cnAlpha = pluckNumber(connectorObj.alpha, connectorsObj.alpha, 100);
                        cnThickness = pluckNumber(connectorObj.thickness, connectorsObj.thickness, 1);
                        cnIsDashed = pluckNumber(connectorObj.isdashed, connectorsObj.isdashed, 1);

                        //Extract the attributes
                        hcConnectors.push({
                            fromTaskId: getFirstValue(connectorObj.fromtaskid, BLANK).toUpperCase(),
                            toTaskId: getFirstValue(connectorObj.totaskid, BLANK).toUpperCase(),
                            fromTaskConnectStart: pluckNumber(connectorObj.fromtaskconnectstart, 0),
                            toTaskConnectStart: pluckNumber(connectorObj.totaskconnectstart, 1),
                            color: convertColor(cnColor),
                            alpha: cnAlpha * 0.01,
                            link: connectorObj.link,
                            showHoverEffect: pluckNumber(connectorObj.showhovereffect,
                                connectorsObj.showhovereffect, chartDef.showconnectorhovereffect,
                                    chartDef.showhovereffect, 1),
                            hoverColor: convertColor(pluck(connectorObj.hovercolor,
                                connectorsObj.hovercolor, chartDef.connectorhovercolor,
                                getDarkColor(cnColor, 80)),
                                pluckNumber(connectorObj.hoveralpha,
                                connectorsObj.hoveralpha, chartDef.connectorhoveralpha, cnAlpha)),
                            hoverThickness: pluckNumber(connectorObj.hoverthickness,
                                connectorsObj.hoverthickness, chartDef.connectorhoverthickness,
                                    cnThickness),
                            thickness: cnThickness,
                            dashedStyle: cnIsDashed ?
                                getDashStyle(pluckNumber(connectorObj.dashlen,
                                connectorsObj.dashlen, 5),
                                pluckNumber(connectorObj.dashgap, connectorsObj.dashgap,
                                cnThickness), cnThickness) : undefined
                        });
                    }
                }
            }

            // Legend attributes parsing
            hc.legend.enabled = Boolean(pluckNumber(chartDef.showlegend, 1));
            // Disable legend interactivity
            hc.legend.interactiveLegend = false;
            hc.legend.itemStyle.cursor = 'default';
            hc.legend.itemHoverStyle = {
                cursor : 'inherit'
            };
            len = legendItm && legendItm.length;
            for (i = 0; i < len; i += 1) {
                legObj = legendItm[i];
                (defined(legObj.label) && legObj.label !== BLANK) &&
                    hc.series.push({
                        name: parseUnsafeString(legObj.label),
                        showInLegend: true,
                        type: false,
                        color: parseColor(pluck(legObj.color, colorM.getPlotColor()))
                    });
            }


            hc.max = maxDate;
            hc.min = minDate;

            hc.chart.hasScroll = true;

            return hc;
        },

        spaceManager: function (hc, definition, width, height) {

            // Title space-manager
            this.titleSpaceManager(hc, definition, width, height * 0.3);

            var iapi = this,
                numberFormatter = iapi.numberFormatter,
                chart = hc.chart,
                chartDef = definition.chart,
                dataTable = hc.dataTable,
                cat = hc.categories,
                hcScroll = hc.scrollOptions = {},
                scrollOptions = dataTable.__scrollOptions = {},
                process = dataTable.processHeader,
                canvasHeight = height - chart.marginTop - chart.marginBottom,
                canvasWidth = width - chart.marginLeft - chart.marginRight,
                totalGridWidth = chart.totalGridWidth,
                verScrl = hc.verticalScroll = {
                    enabled: pluckNumber(chartDef.useverticalscrolling, 1)
                },
                ganttPD = pluckNumber(chartDef.ganttpaneduration, -1),
                ganttPDU = pluck(chartDef.ganttpanedurationunit, 's').toLowerCase(),
                catStDt = numberFormatter.getDateValue(chartDef.scrolltodate).ms,
                maxRowH = process && process.maxProcessHeight,
                minDt,
                proAvH,
                totalScrollH,
                processH;

            // recalculating height after allocation the title height.
            if (process) {

                if (hc.legend.enabled) {
                    canvasHeight -= this.placeLegendBlockBottom(hc, definition,
                        canvasWidth, canvasHeight / 2);
                }

                canvasHeight = canvasHeight - process.dimension.h;

                hcScroll.padding = pluckNumber(chartDef.scrollpadding,
                    hc.chart.plotBorderWidth / 2);
                hcScroll.height = pluckNumber(chartDef.scrollheight, 16);
                hcScroll.showButtons = !!pluckNumber(chartDef.scrollshowbuttons, 1);
                hcScroll.buttonPadding = pluckNumber(chartDef.scrollbtnpadding, 0);
                hcScroll.flatScrollBars = pluckNumber(chartDef.flatscrollbars, 0);
                hcScroll.color = getFirstColor(pluck(chartDef.scrollcolor,
                    this.colorManager.getColor('altHGridColor')));
                totalScrollH = hcScroll.height + hcScroll.padding;

                if (totalGridWidth > chart.ganttStartX) {
                    scrollOptions.enabled = true;
                    scrollOptions.startPercent =
                        Boolean(pluckNumber(chartDef.scrolltoend, 0));
                }

                canvasWidth -= chart.ganttStartX;

                cat.scroll = {};
                minDt = new Date(cat && cat.min);
                if (ganttPD !== -1) {
                    switch (ganttPDU) {
                        case 'y' :
                            minDt.setYear(minDt.getFullYear() + ganttPD);
                            break;
                        case 'm' :
                            minDt.setMonth(minDt.getMonth() + ganttPD);
                            break;
                        case 'd' :
                            minDt.setDate(minDt.getDate() + ganttPD);
                            break;
                        case 'h' :
                            minDt.setHours(minDt.getHours() + ganttPD);
                            break;
                        case 'mn' :
                            minDt.setMinutes(minDt.getMinutes() + ganttPD);
                            break;
                        default :
                            minDt.setSeconds(minDt.getSeconds() + ganttPD);
                            break;
                    }
                    minDt = minDt.getTime();

                    if (minDt > hc.min && minDt < hc.max) {
                        hc.visibleMax = minDt;
                        cat.scroll.enabled = true;
                    }
                }

                // Process grid or category grid needs a scroll bar
                if (scrollOptions.enabled || cat.scroll.enabled) {
                    canvasHeight -= totalScrollH;
                }
                proAvH = canvasHeight / process.processCount;

                /** @todo: need a proper attribute name for the process height */
                maxRowH = pluckNumber(chartDef.rowheight, maxRowH);

                if (maxRowH - proAvH > 0) {
                    if (maxRowH - proAvH < 3) {
                        processH = maxRowH = proAvH;
                    } else {
                        processH = maxRowH =
                            canvasHeight / mathRound(canvasHeight / maxRowH);
                    }
                }
                process.maxProcessHeight = maxRowH;

                // Need a vertical scroll or not
                if (verScrl.enabled && proAvH < maxRowH) {
                    processH = maxRowH;
                    verScrl.startPercent =
                        Boolean(pluckNumber(chartDef.scrolltoend, 0));
                    canvasWidth -= totalScrollH;
                } else {
                    verScrl.enabled = false;
                    processH = proAvH;
                }

                cat.scroll.startPercent =
                    (pluckNumber(chartDef.scrolltoend, 0));

                if (hc.min === Infinity || hc.max === -Infinity ||
                        hc.min === hc.max) {
                    hc.min = cat.min = 0;
                    hc.max = cat.max = 1;
                }
                if (cat.min === Infinity || cat.max === -Infinity) {
                    cat.min = hc.min;
                    cat.max = hc.max;
                }

                cat.axis = new GanttAxis(hc, canvasWidth);
                cat.startX = cat.axis.getPixel(mathMin(cat.min, hc.min));
                cat.endX = cat.axis.getPixel(mathMax(cat.max, hc.max));
                cat.visibleW = canvasWidth;

                // Scroll from start date
                if (catStDt && catStDt > cat.min && catStDt < cat.max) {
                    cat.scroll.startPercent = mathMin((cat.axis.getPixel(catStDt) -
                        cat.startX) / ((cat.endX - cat.startX) - cat.visibleW), 1);
                }

                chart.processHeight = canvasHeight + process.dimension.h;
                while (process) {
                    process.nextCol && (process.nextCol.dimension.h = processH);
                    process = process.nextRow;
                }
            }
        }

    }, chartapi.gaugebase);

    renderer('renderer.gantt', {

        drawProcess: function (gridObj) {
            var chart = this,
                hc = chart.options,
                chartOptions = hc.chart,
                //dataTable = hc.dataTable,
                //gridObj = dataTable && dataTable.processHeader,
                paper = chart.paper,
                logic = chart.logic,
                smartLabel = logic.smartLabel,
                canvasTop = chart.canvasTop,
                canvasLeft = chart.canvasLeft,
                layers = chart.layers,
                gridLayer = layers.gridLayer,
                gridHeaderLayer = layers.gridHeaderLayer,

                gridBorderW = chartOptions.gridBorderThickness,
                hGBW = gridBorderW * 0.5,
                gridBorderColor = chartOptions.gridBorderColor,
                gridBorderDashStyle = chartOptions.gridBorderDashStyle,
                rX = 0,
                rY = 0,
                gBPath = [],
                yPos = canvasTop,
                TRACKER_W = 30,
                gridW = gridObj.dimension.w || 16,
                x = gridObj.dimension.x || 0,
                process = hc.dataTable.processHeader,
                proH = process.nextCol.dimension.h,
                totalPH = process.dimension.h + (process.processCount *
                    process.nextCol.dimension.h),
                //Roll-over band properties
                rollOverColor = convertColor(pluck(logic.dataObj.chart.rolloverbandcolor,
                        '#FF0000'),
                        pluck(logic.dataObj.chart.rolloverbandalpha, 30)),
                items = process.items || (process.items = {}),
                cat  = hc.categories || {},
                eventArgs,
                setLink,
                retYPos,
                layer,
                attrs,
                ele,
                txtAlign,
                smrtTxt,
                style,
                text,
                xPos,
                d,
                clickHandler,
                hoverRollOver,
                hoverRollOut;

            // Create hover band element
            if (!items.hoverEle) {
                items.hoverEle = paper.rect(cat.startX, 0, cat.endX,
                        proH, 0, layers.dataset)
                .attr({
                    fill: rollOverColor,
                    visibility: 'hidden',
                    'stroke-width': 0
                });
            }

            clickHandler = function (e) {
                var ele = this;
                /**
                 * In `Gantt` chart, process element represents one process on the Gantt chart.
                 * You can show team members, projects or task list as a process - there's no restriction to that.
                 * This event is fired when a process is clicked
                 *
                 * This event is only applicable to Gantt chart.
                 *
                 * @event FusionCharts#processClick
                 *
                 * @param {string} align - The alignment of the process label.
                 * @param {string} vAlign - The vertical alignment of the process label.
                 * @param {string} id - The id of the process.
                 * @param {number} chartX - x-coordinate of the pointer relative to the chart.
                 * @param {number} chartY - y-coordinate of the pointer relative to the chart.
                 * @param {number} pageX - x-coordinate of the pointer relative to the page.
                 * @param {number} pageY - y-coordinate of the pointer relative to the page.
                 * @param {string} link - URL set for the process on mouse click.
                 * @param {string} label - The label in the process
                 * @see FusionCharts#event:processRollOver
                 * @see FusionCharts#event:processRollOut
                 */
                plotEventHandler.call(ele, chart, e, 'ProcessClick');
            };

            hoverRollOver = function (e) {
                var ele = this;
                hoverTimeout = clearTimeout(hoverTimeout);
                lastHoverEle && chart.gridOutHandler.call(lastHoverEle);
                lastHoverEle = null;
                chart.gridHoverHandler.call(ele);
                /**
                 * In `Gantt` chart, process element represents one process on the Gantt chart.
                 * You can show team members, projects or task list as a process - there's no restriction to that.
                 * This event is fired when the pointer moves over a process
                 *
                 * This event is only applicable to Gantt chart.
                 *
                 * @event FusionCharts#processRollOver
                 *
                 * @param {string} align - The alignment of the process label.
                 * @param {string} vAlign - The vertical alignment of the process label.
                 * @param {string} id - The id of the process.
                 * @param {number} chartX - x-coordinate of the pointer relative to the chart.
                 * @param {number} chartY - y-coordinate of the pointer relative to the chart.
                 * @param {number} pageX - x-coordinate of the pointer relative to the page.
                 * @param {number} pageY - y-coordinate of the pointer relative to the page.
                 * @param {string} link - URL set for the process on mouse click.
                 * @param {string} label - The label in the process.
                 * @see FusionCharts#event:processClick
                 * @see FusionCharts#event:processRollOut
                 */
                plotEventHandler.call(ele, chart, e, 'ProcessRollOver');
            };


            hoverRollOut = function (e) {
                lastHoverEle = this;
                hoverTimeout = clearTimeout(hoverTimeout);
                hoverTimeout = setTimeout(function () {
                    chart.gridOutHandler.call(lastHoverEle);
                }, 500);
                /**
                 * In `Gantt` chart, process element represents one process on the Gantt chart.
                 * You can show team members, projects or task list as a process - there's no restriction to that.
                 * This event is fired when the pointer moves out of a process
                 *
                 * This event is only applicable to Gantt chart.
                 *
                 * @event FusionCharts#processRollOut
                 *
                 * @param {string} align - The alignment of the process label.
                 * @param {string} vAlign - The vertical alignment of the process label.
                 * @param {string} id - The id of the process.
                 * @param {number} chartX - x-coordinate of the pointer relative to the chart.
                 * @param {number} chartY - y-coordinate of the pointer relative to the chart.
                 * @param {number} pageX - x-coordinate of the pointer relative to the page.
                 * @param {number} pageY - y-coordinate of the pointer relative to the page.
                 * @param {string} link - URL set for the process on mouse click.
                 * @param {string} label - The label in the process
                 * @see FusionCharts#event:processClick
                 * @see FusionCharts#event:processRollOver
                 */
                plotEventHandler.call(lastHoverEle, chart, e, 'ProcessRollOut');
            };

            // Itrate througn all grids objects
            while (gridObj) {
                d = gridObj.dimension;
                xPos = canvasLeft + x;
                text = gridObj.text;
                txtAlign = gridObj.align;
                items = gridObj.items || (gridObj.items = {});
                setLink = gridObj.link;
                layer = gridObj.isHeader ? gridHeaderLayer : gridLayer;
                ele = items.background;
                retYPos = mathCeil(yPos + rY) - 0.5;
                attrs = {
                    x: mathCeil(xPos + rX) - 0.5,
                    y: retYPos,
                    width: gridW + 0.5,
                    height: d.h + hGBW + 0.5,
                    radius: 0,
                    fill: gridObj.bgColor || TRACKER_FILL,
                    'stroke-dasharray': gridBorderDashStyle,
                    stroke: gridBorderColor,
                    cursor: setLink ? 'pointer' : BLANK,
                    'stroke-width': 0
                };
                // Background rect.
                if (ele) {
                    ele.attr(attrs);
                } else {
                    items.background = paper.rect(layer)
                    .attr(attrs)
                    .hover(hoverRollOver, hoverRollOut);

                    eventArgs = {
                        label: gridObj.text,
                        vAlign: gridObj.vAlign,
                        align: gridObj.align,
                        link: gridObj.link,
                        id: gridObj.id
                    };

                    items.background
                    .click(clickHandler)
                    .data('dataObj', gridObj)
                    .data('eventArgs', eventArgs)
                    .data('data', {
                        y: retYPos,
                        gridObj: gridObj,
                        rollOverColor: rollOverColor,
                        useHover: true,
                        useNext: true,
                        hoverEle: process.items.hoverEle
                    });
                }

                if (!gridObj.isNaN) {
                    d = gridObj.dimension;
                    text = gridObj.text;
                    txtAlign = gridObj.align;
                    ele = items.label;


                    // Grid label text.
                    text = gridObj.text;
                    if (defined(text) && text !== BLANK) {
                        style = gridObj.style;
                        smartLabel.setStyle(style);
                        smrtTxt = smartLabel.getSmartText(text, gridW - 8,
                            mathMax(pInt(style.lineHeight, 10), d.h));

                        style.title = smrtTxt.oriText;
                        txtAlign = gridObj.align;

                        attrs = {
                            text: smrtTxt.text,
                            x: xPos + (gridW * xAlign[txtAlign]) + alignGutter[txtAlign],
                            y: (yPos + d.h) - (d.h * yAlign[gridObj.vAlign]),
                            'text-anchor': align[txtAlign],
                            cursor: setLink ? 'pointer' : BLANK,
                            'vertical-align': gridObj.vAlign
                        };

                        if (ele) {
                            ele.attr(attrs);
                        } else {
                            items.label = paper.text(layer)
                            .attr(attrs)
                            .css(style)
                            .hover(hoverRollOver, hoverRollOut)
                            .click(clickHandler)
                            .data('eventArgs', eventArgs)
                            .data('dataObj', gridObj)
                            .data('data', {
                                y: retYPos,
                                gridObj: gridObj,
                                rollOverColor: rollOverColor,
                                useHover: true,
                                useNext: true,
                                hoverEle: process.items.hoverEle
                            });
                        }
                    }
                }

                gridObj.xPos = xPos;
                gridObj.yPos = mathCeil(yPos + d.h) -
                        (gridBorderW % 2) * 0.5;

                gBPath.push(M, xPos, gridObj.yPos, h, gridW);
                ele = items.hBorder;
                if (ele) {
                    ele.attr('path', gBPath);
                } else {
                    items.hBorder = paper.path(gBPath,
                        layer)
                    .attr({
                        'stroke-dasharray': gridBorderDashStyle,
                        stroke: gridBorderColor,
                        'stroke-width': gridBorderW
                    });
                }

                yPos += d.h;

                if (!gridObj.nextCol) {
                    rX = hGBW;
                    rY -= 0;

                    ele = gridObj.first.items.vBorder;
                    attrs = [M, mathCeil(xPos + gridW) - ((gridBorderW % 2) *
                                0.5), canvasTop, v, totalPH];
                    if (ele) {
                        ele.attr('path', attrs);
                    } else {
                        gridObj.first.items.vBorder = paper.path(attrs,
                            gridHeaderLayer)
                        .attr({
                            'stroke-dasharray': gridBorderDashStyle,
                            stroke: gridBorderColor,
                            'stroke-width': gridBorderW
                        });
                    }

                    // Draw the tracker to resize grid
                    if (gridObj.nextRow && !gridObj.isLast) {
                        if (!gridObj.first.items.dragEle) {
                            gridObj.first.items.dragEle = paper.path(attrs,
                                layers.gridTracker)
                            .attr({
                                stroke: chartOptions.gridResizeBarColor,
                                'stroke-width': chartOptions.gridResizeBarThickness,
                                visibility: 'hidden'
                            });
                        }

                        if (!gridObj.first.items.tracker) {
                            gridObj.first.items.tracker = paper.path(attrs,
                                layers.gridTracker)
                            .attr({
                                stroke: TRACKER_FILL,
                                ishot: true,
                                'stroke-width': TRACKER_W
                            })
                            .css('cursor', R.svg && 'ew-resize' || 'e-resize')
                            .drag(this.dragMove,  this.dragStart, this.dragUp)
                            .data('drag-options', {
                                grid: gridObj.first,
                                xPos: mathCeil(xPos + gridW) - ((gridBorderW % 2) * 0.5),
                                chart: chart
                            });
                        }
                    }
                }

                gridObj = gridObj.nextCol;
            }
        },

        dragStart: function () {
            var ele = this,
                data = ele.data('drag-options'),
                gridObj = data.grid,
                items = gridObj.items,
                nextObj = gridObj.nextRow,
                def = {style: {lineHeight: 16}},
                dCol = gridObj.nextCol.style || def,
                ndCol = nextObj && nextObj.nextCol && nextObj.nextCol.style || def,
                chart = data.chart,
                left = chart.canvasLeft,
                dimension = gridObj.dimension,
                minWL = mathMax(pInt(gridObj.style.lineHeight, 10),
                    pInt(dCol.lineHeight, 10)) + 2,
                minWR = mathMax(pInt((nextObj || def).style.lineHeight, 10),
                    pInt(ndCol.lineHeight, 10)) + 2;

            data.leftSideLimit = left + pluckNumber(gridObj.dimension.x, 0) +
                minWL;
            data.rightSideLimit = left + pluckNumber(nextObj &&
                nextObj.dimension.x + nextObj.dimension.w, dimension.x +
                dimension.w) - minWR;

            // store original x, y positions
            data.origX = data.lastX || (data.lastX = 0);
            items.dragEle.show();

            // trackerClicked is a flag to determine whether the click started
            // from resize tracker or not
            chart.trackerClicked = true;
            data.draged = false;
        },

        dragMove: function (dx) {
            var ele = this,
                data = ele.data('drag-options'),
                gridObj = data.grid,
                items = gridObj.items,
                startX = data.xPos + dx,
                leftSideLimit = data.leftSideLimit,
                rightSideLimit = data.rightSideLimit,
                transform;

            //bound limits
            if (startX < leftSideLimit) {
                dx = leftSideLimit - data.xPos;
            }
            if (startX > rightSideLimit) {
                dx = rightSideLimit - data.xPos;
            }

            transform = {
                transform: 't' + (data.origX + dx) + COMMA + 0
            };

            ele.attr(transform);
            items.dragEle.attr(transform);

            data.draged = true;
            data.lastX = dx;
        },

        dragUp: function () {
            var ele = this,
                data = ele.data('drag-options'),
                chart = data.chart,
                gridObj = data.grid,
                nextRow = gridObj.nextRow,
                left = chart.canvasLeft,
                dim = gridObj.dimension,
                ndim = nextRow && nextRow.dimension,
                items = gridObj.items,
                reflow = {
                    hcJSON: {
                        dataTable: {
                        }
                    }
                };

            // trackerClicked is a flag to determine whether the click started
            // from resize tracker or not
            chart.trackerClicked = false;
            items.dragEle.hide();
            // restoring state with respect to original state
            if (data.draged) {
                dim.w = (data.xPos + data.lastX - left) - dim.x;
                gridObj.nextCol && (gridObj.nextCol.dimension.w = dim.w);
                // Save state
                reflow.hcJSON.dataTable[gridObj.key] = {
                    dimension: dim
                };
                if (nextRow) {
                    ndim.w = ndim.w + (ndim.x - dim.x - dim.w);
                    ndim.x = dim.x + dim.w;
                    nextRow.dimension.w = ndim.w;
                    nextRow.dimension.x = ndim.x;
                    // Draw the grid
                    chart.drawProcess(nextRow);
                    // Save state
                    reflow.hcJSON.dataTable[nextRow.key] = {
                        dimension: ndim
                    };
                }
                // Draw the grid
                chart.drawProcess(gridObj);
                extend2(chart.logic.chartInstance.jsVars._reflowData,
                    reflow, true);

                data.xPos += data.lastX ;
                data.lastX += data.origX;
            }
        },

        drawCategories: function () {
            var chart = this,
                hc = chart.options,
                chartOptions = hc.chart,
                paper = chart.paper,
                layers = chart.layers,
                smartLabel = chart.logic.smartLabel,
                canvasTop = chart.canvasTop,
                categories = hc.categories,
                process = hc.dataTable.processHeader,
                cat = categories.FCCAT_0_0,
                axis = categories.axis,
                endX = categories.endX,
                startX = categories.startX,
                width = endX - startX,
                gNTh = chartOptions.ganttLineThickness,
                totalPH = process.totalPH + process.dimension.h,
                gridBPath = [],
                gridHPath = [],
                ganttLayer = layers.dataset,
                ganttHeaderLayer = layers.ganttHeaderLayer,
                eventArgs,
                isLastCol,
                setLink,
                items,
                smrtTxt,
                txtAlign,
                txtVAlign,
                catW,
                catH,
                catX,
                catX2,
                xPos,
                scrollH,
                yPos,
                categoryClickHandler,
                categoryRollOver,
                categoryRollOut;

            categoryClickHandler = function (e) {
                var ele = this;
                /**
                 * In `Gantt` chart, category element distributes the time line into visual divisions
                 * This event is fired when a category is clicked.
                 *
                 * This event is only applicable to Gantt chart.
                 *
                 * @event FusionCharts#categoryClick
                 *
                 * @param {string} align - The alignment of the category label.
                 * @param {string} vAlign - The vertical alignment of the category label.
                 * @param {number} chartX - x-coordinate of the pointer relative to the chart.
                 * @param {number} chartY - y-coordinate of the pointer relative to the chart.
                 * @param {number} pageX - x-coordinate of the pointer relative to the page.
                 * @param {number} pageY - y-coordinate of the pointer relative to the page.
                 * @param {string} link - URL set for the category on mouse click.
                 * @param {string} text - The label in the category
                 * @see FusionCharts#event:categoryRollOver
                 * @see FusionCharts#event:categoryRollOut
                 */
                plotEventHandler.call(ele, chart, e, 'CategoryClick');
            };

            categoryRollOver = function (e) {
                var ele = this;
                hoverTimeout = clearTimeout(hoverTimeout);
                lastHoverEle && chart.gridOutHandler.call(lastHoverEle);
                lastHoverEle = null;
                chart.gridHoverHandler.call(ele);
                /**
                 * In `Gantt` chart, category element distributes the time line into visual divisions
                 * This event is fired when the pointer moves over a category.
                 *
                 * This event is only applicable to Gantt chart.
                 *
                 * @event FusionCharts#categoryRollOver
                 *
                 * @param {string} align - The alignment of the category label.
                 * @param {string} vAlign - The vertical alignment of the category label.
                 * @param {number} chartX - x-coordinate of the pointer relative to the chart.
                 * @param {number} chartY - y-coordinate of the pointer relative to the chart.
                 * @param {number} pageX - x-coordinate of the pointer relative to the page.
                 * @param {number} pageY - y-coordinate of the pointer relative to the page.
                 * @param {string} link - URL set for the category on mouse click.
                 * @param {string} text - The label in the category
                 * @see FusionCharts#event:categoryClick
                 * @see FusionCharts#event:categoryRollOut
                 */
                plotEventHandler.call(ele, chart, e, 'CategoryRollOver');
            };

            categoryRollOut = function (e) {
                lastHoverEle = this;
                hoverTimeout = clearTimeout(hoverTimeout);
                hoverTimeout = setTimeout(function () {
                    chart.gridOutHandler.call(lastHoverEle);
                }, 500);
                /**
                 * In `Gantt` chart, category element distributes the time line into visual divisions
                 * This event is fired when the pointer moves out of a category.
                 *
                 * This event is only applicable to Gantt chart.
                 *
                 * @event FusionCharts#categoryRollOut
                 *
                 * @param {string} align - The alignment of the category label.
                 * @param {string} vAlign - The vertical alignment of the category label.
                 * @param {number} chartX - x-coordinate of the pointer relative to the chart.
                 * @param {number} chartY - y-coordinate of the pointer relative to the chart.
                 * @param {number} pageX - x-coordinate of the pointer relative to the page.
                 * @param {number} pageY - y-coordinate of the pointer relative to the page.
                 * @param {string} link - URL set for the category on mouse click.
                 * @param {string} text - The label in the category
                 * @see FusionCharts#event:categoryClick
                 * @see FusionCharts#event:categoryRollOver
                 */
                plotEventHandler.call(lastHoverEle, chart, e, 'CategoryRollOut');
            };


            items = categories.items || (categories.items = {});
            process = hc.dataTable.processHeader;
            items.hoverEle = paper.rect(0, canvasTop + process.dimension.h, 50,
                totalPH, 0, ganttLayer)
            .attr({
                fill: TRACKER_FILL,
                visibility: 'hidden',
                'stroke-width': 0
            });

            while (cat) {
                catW = (width / cat.dimension.numCat);
                catX2 = startX + (catW * (cat.index + 1));
                catX = (catX2 - catW);
                catH = cat.dimension.h;
                xPos = catX;
                yPos = canvasTop + cat.dimension.y;
                txtAlign = cat.align;
                txtVAlign = cat.vAlign;
                setLink = cat.link;
                items = cat.items || (cat.items = {});
                isLastCol = !!(cat.nextRow || !cat.nextCol);
                scrollH = ((hc.verticalScroll.enabled && isLastCol) ?
                    hc.scrollOptions.height : 0);

                eventArgs = {
                    align: cat.align,
                    vAlign: cat.vAlign,
                    link: cat.link,
                    text: cat.text
                };

                catX = xPos = pluckNumber(axis.getPixel(cat.start), catX);

                catX2 = pluckNumber(axis.getPixel(!isLastCol &&
                    cat.nextCol.start || (isLastCol ? mathMax((cat.end || 0),
                    hc.max) : undefined)), catX2);

                catW = catX2 - catX;

                xPos = mathRound(xPos) + 0.5;
                yPos = mathRound(yPos) + 0.5;

                if (cat.isLast) {
                    gridBPath.push(M, xPos, yPos, v, totalPH);
                    yPos -= gNTh * 0.5;
                    catH -= gNTh;

                    if (chartOptions.extendCategoryBg) {
                        paper.rect(xPos, yPos, catW, totalPH, 0, ganttLayer)
                        .attr({
                            fill: cat.bgColor,
                            'stroke-width': 0,
                            stroke: chartOptions.ganttLineColor
                        })
                        .toBack();
                    }
                }

                items.background = paper.rect(xPos, yPos, catW +  scrollH, catH,
                    0, ganttHeaderLayer)
                .attr({
                    fill: cat.bgColor,
                    'stroke-width': 0,
                    cursor: setLink ? 'pointer' : BLANK,
                    stroke: chartOptions.ganttLineColor
                })
                .click(categoryClickHandler)
                .data('eventArgs', eventArgs)
                .data('dataObj', cat)
                .hover(categoryRollOver, categoryRollOut)
                .data('data', {
                    x: xPos,
                    width: catW,
                    gridObj: cat,
                    hoverEle: categories.items.hoverEle
                });

                gridHPath.push(M, xPos, yPos, v, catH);

                if (cat.nextRow) {
                    gridHPath.push(M, startX, (yPos + catH), H, endX + scrollH);
                }

                smartLabel.setStyle(cat.style);
                smrtTxt = smartLabel.getSmartText(cat.text, catW - GUTTER_5, catH);
                cat.style.title = smrtTxt.oriText;

                items.label = paper.text(ganttHeaderLayer)
                .attr({
                    text: smrtTxt.text,
                    x: xPos + (catW * xAlign[txtAlign]) + alignGutter[txtAlign],
                    y: yPos + catH - (catH * yAlign[txtVAlign]),
                    'text-anchor': align[txtAlign],
                    cursor: setLink ? 'pointer' : BLANK,
                    'vertical-align': txtVAlign
                })
                .css(cat.style)
                .hover(categoryRollOver, categoryRollOut)
                .click(categoryClickHandler)
                .data('eventArgs', eventArgs)
                .data('dataObj', cat)
                .data('data', {
                    x: xPos,
                    width: catW,
                    gridObj: cat,
                    hoverEle: categories.items.hoverEle
                });

                cat = cat.nextCol;
            }

            while (process) {
                gridBPath.push(M, categories.startX, process.yPos, H, endX);
                process = process.nextCol;
            }

            items = categories.items || (categories.items = {});

            items.headerGrid = paper.path(gridHPath, ganttHeaderLayer)
            .attr({
                'stroke-dasharray': chartOptions.ganttLineDashStyle,
                'stroke-width': gNTh,
                stroke: chartOptions.ganttLineColor
            });

            items.processGrid = paper.path(gridBPath, ganttLayer)
            .attr({
                'stroke-dasharray': chartOptions.ganttLineDashStyle,
                'stroke-width': chartOptions.ganttLineThickness,
                stroke: chartOptions.ganttLineColor
            });

        },

        drawScroller: function () {
            var chart = this,
                hc = chart.options,
                paper = chart.paper,
                layers = chart.layers,
                canvasTop = chart.canvasTop,
                canvasHeight = chart.canvasHeight,
                hcScroll = hc.scrollOptions,
                categories = hc.categories,
                endX = categories.endX,
                startX = categories.startX,
                width = endX - startX,
                scrollDisplayStyle = hcScroll.flatScrollBars,
                catReflow = {
                    hcJSON: {
                        categories: {
                            scroll: {
                            }
                        }
                    }
                },
                ganttLayer = layers.dataset,
                labelsLayer = layers.datalabels,
                trackerLayer = layers.ganttTracker,
                ganttHeaderLayer = layers.ganttHeaderLayer,
                reflowData = chart.logic.chartInstance &&
                    chart.logic.chartInstance.jsVars._reflowData || {},
                chartOptions = hc.chart,
                gridLayer = layers.gridLayer,
                dataTable = hc.dataTable,
                process = dataTable && dataTable.processHeader,
                canvasLeft = chart.canvasLeft,
                canvasWidth = chart.canvasWidth,
                //gridBorderW = chartOptions.gridBorderW,
                gridBorderW = chartOptions.gridBorderThickness,
                totalGridWidth = chartOptions.totalGridWidth,
                gridEndX = mathMin(chartOptions.ganttStartX,
                    totalGridWidth) + gridBorderW,

                catScroll = categories.scroll,
                processScroll = dataTable && dataTable.__scrollOptions,
                verticalScroll = hc.verticalScroll,
                reflow = {
                    hcJSON: {
                        dataTable: {
                            __scrollOptions: {
                            }
                        },
                        verticalScroll: {

                        }
                    }
                },
                reflowScroll = reflow.hcJSON.dataTable.__scrollOptions,
                totalPH = process.totalPH = process.processCount *
                        process.nextCol.dimension.h,
                gridHeaderLayer = layers.gridHeaderLayer,
                gridTracker = layers.gridTracker,
                visiblePH,
                ratio,
                offset,
                scrollLayer;

            startX = pluckNumber(categories.startX, chartOptions.ganttStartX);

            scrollLayer = layers.scroll = layers.scroll ||
                 paper.group('scroll').insertAfter(trackerLayer);

            if (catScroll.enabled) {

                ratio = categories.visibleW / width;
                catScroll.scroller = paper.scroller(startX, canvasTop + canvasHeight - hcScroll.height,
                    categories.visibleW, hcScroll.height , true, {
                        showButtons: hcScroll.showButtons,
                        displayStyleFlat: scrollDisplayStyle,
                        buttonWidth: hcScroll.buttonWidth,
                        scrollRatio: ratio,
                        scrollPosition: catScroll.startPercent
                    }, scrollLayer)
                    .attr({
                        'scroll-display-style': scrollDisplayStyle,
                        'fill': hcScroll.color
                    })
                    .scroll(function (pos) {
                        offset = -mathRound(pos * (width - categories.visibleW));

                        ganttLayer && ganttLayer.transform(['T', offset,
                            ganttLayer.data(vFs)]);
                        labelsLayer && labelsLayer.transform(['T', offset,
                            labelsLayer.data(vFs)]);
                        trackerLayer && trackerLayer.transform(['T', offset,
                            trackerLayer.data(vFs)]);
                        ganttHeaderLayer && ganttHeaderLayer.transform(['T',
                            offset, 0]);

                        ganttLayer && ganttLayer.data(hFs, offset);
                        labelsLayer && labelsLayer.data(hFs, offset);
                        trackerLayer && trackerLayer.data(hFs, offset);

                        catReflow.hcJSON.categories.scroll.startPercent = pos;
                        extend2(reflowData, catReflow, true);
                    });

                (function () {
                    var prevPos;
                    R.eve.on('raphael.scroll.start.' + catScroll.scroller.id, function (pos) {
                        prevPos = pos;
                        global.raiseEvent('scrollstart', {
                            scrollPosition: pos
                        }, chart.logic.chartInstance);
                    });

                    R.eve.on('raphael.scroll.end.' + catScroll.scroller.id, function (pos) {
                        global.raiseEvent('scrollend', {
                            prevScrollPosition: prevPos,
                            scrollPosition: pos
                        }, chart.logic.chartInstance);

                    });
                }());

                if (catScroll.startPercent) {
                    offset = -mathRound(catScroll.startPercent *
                            (width - categories.visibleW));

                    ganttLayer && ganttLayer.data(hFs, offset);
                    labelsLayer && labelsLayer.data(hFs, offset);
                    trackerLayer && trackerLayer.data(hFs, offset);
                    ganttHeaderLayer && ganttHeaderLayer.transform(['T',
                        offset, 0]);
                    ganttLayer && ganttLayer.transform(['T', offset,
                        ganttLayer.data(vFs)]);
                    labelsLayer && labelsLayer.transform(['T', offset,
                        ganttLayer.data(vFs)]);
                    trackerLayer && trackerLayer.transform(['T', offset,
                        ganttLayer.data(vFs)]);
                }
            }

            if (processScroll.enabled) {
                ratio = gridEndX / totalGridWidth;

                processScroll.scroller = paper.scroller(canvasLeft, canvasTop + canvasHeight -
                        hcScroll.height, gridEndX, hcScroll.height , true, {
                        showButtons: hcScroll.showButtons,
                        displayStyleFlat: scrollDisplayStyle,
                        buttonWidth: hcScroll.buttonWidth,
                        scrollRatio: ratio,
                        scrollPosition: processScroll.startPercent
                    }, scrollLayer)
                    .attr({
                        'scroll-display-style': scrollDisplayStyle,
                        'fill': hcScroll.color
                    })
                    .scroll(function (pos) {
                        offset = -mathRound(pos * (totalGridWidth - gridEndX));
                        gridLayer && gridLayer.transform(['T', offset,
                            gridLayer.data(vFs)]);
                        gridHeaderLayer && gridHeaderLayer.transform(['T', offset, 0]);
                        gridTracker && gridTracker.transform(['T', offset,
                            gridTracker.data(vFs)]);

                        gridLayer.data(hFs, offset);
                        gridHeaderLayer.data(hFs, offset);
                        gridTracker.data(hFs, offset);

                        // save state
                        reflowScroll.startPercent = pos;
                        extend2(reflowData, reflow, true);
                    });

                (function () {
                    var prevPos;
                    R.eve.on('raphael.scroll.start.' + processScroll.scroller.id, function (pos) {
                        prevPos = pos;
                        global.raiseEvent('scrollstart', {
                            scrollPosition: pos
                        }, chart.logic.chartInstance);
                    });

                    R.eve.on('raphael.scroll.end.' + processScroll.scroller.id, function (pos) {
                        global.raiseEvent('scrollend', {
                            prevScrollPosition: prevPos,
                            scrollPosition: pos
                        }, chart.logic.chartInstance);

                    });
                }());

                if (processScroll.startPercent) {
                    offset = -mathRound(processScroll.startPercent *
                        (totalGridWidth - gridEndX));
                    gridLayer && gridLayer.transform(['T', offset, 0]);
                    gridTracker && gridTracker.transform(['T', offset, 0]);
                    gridHeaderLayer && gridHeaderLayer.transform(['T', offset, 0]);

                    gridLayer.data(hFs, offset);
                    gridTracker.data(hFs, offset);
                }
            }

            if (verticalScroll.enabled) {
                visiblePH = chartOptions.processHeight - process.dimension.h;
                //ganttLayer = layers.dataset;

                ratio = visiblePH / totalPH;

                verticalScroll.scroller = paper.scroller(canvasLeft + canvasWidth - hcScroll.height,
                    canvasTop + process.dimension.h,
                    hcScroll.height,
                    chartOptions.processHeight - process.dimension.h, false, {
                        showButtons: hcScroll.showButtons,
                        displayStyleFlat: scrollDisplayStyle,
                        buttonWidth: hcScroll.buttonWidth,
                        scrollRatio: ratio,
                        scrollPosition: verticalScroll.startPercent
                    }, scrollLayer)
                    .attr({
                        'scroll-display-style': scrollDisplayStyle,
                        'fill': hcScroll.color
                    })
                    .scroll(function (pos) {
                        offset = -mathRound(pos * (totalPH - visiblePH));

                        gridLayer && gridLayer.transform(['T', gridLayer.data(hFs), offset]);
                        ganttLayer && ganttLayer.transform(['T', ganttLayer.data(hFs), offset]);
                        labelsLayer && labelsLayer.transform(['T', labelsLayer.data(hFs), offset]);
                        trackerLayer && trackerLayer.transform(['T', trackerLayer.data(hFs), offset]);
                        gridTracker && gridTracker.transform(['T', gridTracker.data(hFs), offset]);

                        gridLayer.data(vFs, offset);
                        gridTracker.data(vFs, offset);
                        ganttLayer.data(vFs, offset);
                        trackerLayer.data(vFs, offset);
                        labelsLayer.data(vFs, offset);

                        // save state
                        reflow.hcJSON.verticalScroll.startPercent = pos;
                        extend2(reflowData, reflow, true);
                    });

                (function () {
                    var prevPos;
                    R.eve.on('raphael.scroll.start.' + verticalScroll.scroller.id, function (pos) {
                        prevPos = pos;
                        global.raiseEvent('scrollstart', {
                            scrollPosition: pos
                        }, chart.logic.chartInstance);
                    });

                    R.eve.on('raphael.scroll.end.' + verticalScroll.scroller.id, function (pos) {
                        global.raiseEvent('scrollend', {
                            prevScrollPosition: prevPos,
                            scrollPosition: pos
                        }, chart.logic.chartInstance);

                    });
                }());

                if (verticalScroll.startPercent) {
                    offset = -mathRound(verticalScroll.startPercent * (totalPH - visiblePH));
                    gridLayer && gridLayer.transform(['T', gridLayer.data(hFs), offset]);
                    ganttLayer && ganttLayer.transform(['T', ganttLayer.data(hFs), offset]);
                    labelsLayer && labelsLayer.transform(['T', labelsLayer.data(hFs), offset]);
                    trackerLayer && trackerLayer.transform(['T', trackerLayer.data(hFs), offset]);
                    gridTracker && gridTracker.transform(['T', gridTracker.data(hFs), offset]);

                    gridLayer.data(vFs, offset);
                    gridTracker.data(vFs, offset);
                    ganttLayer.data(vFs, offset);
                    labelsLayer.data(vFs, offset);
                    trackerLayer.data(vFs, offset);
                }
            }

        },

        finalizeScrollPlots: function () {
            var chart = this,
                hc = chart.options,
                canvasTop = chart.canvasTop,
                categories = hc.categories,
                endX = categories.endX,
                startX = categories.startX,
                catScroll = categories.scroll,

                chartOptions = hc.chart,
                dataTable = hc.dataTable,
                process = dataTable && dataTable.processHeader,
                canvasLeft = chart.canvasLeft,
                gridBorderW = chartOptions.gridBorderThickness,
                totalGridWidth = chartOptions.totalGridWidth,
                gridEndX = mathMin(chartOptions.ganttStartX,
                    totalGridWidth) + gridBorderW,
                config = {},
                fullCanvasWidth = endX - startX - categories.visibleW,
                container = chart.container,
                proScroll = dataTable && dataTable.__scrollOptions,
                vScroll = hc.verticalScroll,
                totalPH = process.totalPH,
                visiblePH = chartOptions.processHeight - process.dimension.h,
                POS = 'scroll-position',
                scrollCat,
                scrollPro,
                scrollVer,
                chartPosition,
                isDraggedInsideCanvas,
                touchScrollBodyEventHandler;

            catScroll = categories.scroll;

            touchScrollBodyEventHandler = function (event) {
                var canvas = chart.elements.canvas,
                    chartPosLeft = chartPosition.left,
                    chartPosTop = chartPosition.top,

                    type = event.type,
                    touchEvent = (hasTouch && lib.getTouchEvent(event)) ||
                        stubEvent,

                    layerX = (event.layerX || touchEvent.layerX) ||
                        ((event.pageX || touchEvent.pageX) - chartPosLeft),
                    layerY = (event.layerY || touchEvent.layerY) ||
                        ((event.pageY || touchEvent.pageY) - chartPosTop),
                    dx,
                    dy;

                switch (type) {
                    case DRAGSTART: // DragStart
                        isDraggedInsideCanvas = canvas.isPointInside(layerX, layerY);

                        scrollCat = (layerX > startX) && (layerX < (startX + categories.visibleW));
                        scrollVer = (layerX > canvasLeft) && (layerX < (startX + categories.visibleW)) &&
                            (layerY > canvasTop + process.dimension.h);
                        scrollPro = layerX < startX;

                        config.ox = isDraggedInsideCanvas && layerX || null;
                        config.oy = isDraggedInsideCanvas && layerY || null;
                        break;

                    case DRAGEND:  // DragEnd
                        isDraggedInsideCanvas = false;
                        config = {};
                        break;

                    default: // DragMove
                        if (!isDraggedInsideCanvas || chart.trackerClicked) {
                            return;
                        }

                        dx = layerX - config.ox;
                        dy = layerY - config.oy;

                        config.ox = layerX;
                        config.oy = layerY;

                        if (scrollCat && catScroll && catScroll.scroller) {
                            config.scrollPosition = catScroll.scroller.attrs[POS] - dx / fullCanvasWidth;
                            catScroll.scroller.attr({
                                'scroll-position': config.scrollPosition
                            });
                        }
                        if (scrollVer && vScroll && vScroll.scroller) {
                            config.vScrollPosition = vScroll.scroller.attrs[POS] - dy / (totalPH - visiblePH);
                            vScroll.scroller.attr({
                                'scroll-position': config.vScrollPosition
                            });
                        }
                        if (scrollPro && proScroll && proScroll.scroller) {
                            config.pScrollPosition = proScroll.scroller.attrs[POS] - dx / (totalGridWidth - gridEndX);
                            proScroll.scroller.attr({
                                'scroll-position': config.pScrollPosition
                            });
                        }
                        break;
                }
            };

            // bind touch scroll on canvas
            if (hasTouch) {
                chartPosition = lib.getPosition(container);

                if (container) {
                    removeEvent(container, 'dragstart drag dragend', touchScrollBodyEventHandler);
                    addEvent(container, 'dragstart drag dragend', touchScrollBodyEventHandler);
                }
            }
        },

        gridHoverHandler: function () {
            var data = this.data('data'),
                obj = data.gridObj,
                prev = !!obj.prevRow,
                attr = {};
            if (!obj.isHeader) {
                data.x && (attr.x = data.x);
                data.y && (attr.y = data.y);
                data.width && (attr.width = data.width);
                data.height && (attr.height = data.height);
                obj.hoverColor && (attr.fill = obj.hoverColor);

                obj.usePlotHover && data.hoverEle.attr(attr).show();

                if (data.useNext && obj.useHover) {
                    while (obj && prev) {
                        obj = obj.prevRow;
                        prev = !!obj.prevRow;
                    }
                    while (obj) {
                        obj.items.background.attr('fill', obj.hoverColor);
                        obj = obj.nextRow;
                    }
                } else {
                    obj.useHover && obj.items.background.attr('fill',
                        obj.hoverColor);
                }
            }
        },

        gridOutHandler: function () {
            var data = this.data('data'),
                obj = data.gridObj,
                prev = !!obj.prevRow;
            if (!obj.isHeader) {
                obj.usePlotHover && data.hoverEle.hide();
                if (data.useNext && obj.useHover) {
                    while (obj && prev) {
                        obj = obj.prevRow;
                        prev = !!obj.prevRow;
                    }
                    while (obj) {
                        obj.items.background.attr('fill', obj.bgColor ||
                                TRACKER_FILL);
                        obj = obj.nextRow;
                    }
                } else {
                    obj.useHover && obj.items.background.attr('fill', obj.bgColor);
                }
            }
        },

        drawAxes: function () {
            if (!this.options.dataTable) {
                return;
            }
            renderer['renderer.cartesian'].drawAxes.call(this, arguments);

            var chart = this,
                hc = chart.options,
                chartOptions = hc.chart,
                paper = chart.paper,
                layers = chart.layers,
                belowDataset = layers.layerBelowDataset,
                aboveDataset = layers.layerAboveDataset,
                gridLayer = layers.gridLayer,
                ganttLayer = layers.dataset,
                dataTable = hc.dataTable,
                categories = hc.categories,
                process = dataTable && dataTable.processHeader,
                canvasTop = chart.canvasTop,
                canvasLeft = chart.canvasLeft,
                gridBorderW = chartOptions.gridBorderThickness,
                totalGridWidth = chartOptions.totalGridWidth,
                gridEndX = mathMin(chartOptions.ganttStartX,
                    totalGridWidth) + gridBorderW,
                proD = process.dimension,
                hH = proD.h,
                pH = chartOptions.processHeight - proD.h,
                startX = pluckNumber(categories.startX, chartOptions.ganttStartX),
                visibleW = categories.visibleW,
                halfGLT = chartOptions.ganttLineThickness * 0.5,
                hGBW = gridBorderW * 0.5,
                gridHeaderLayer,
                ganttHeaderLayer,
                labelsLayer,
                trackerLayer,
                gridTracker;

            process.totalPH = process.processCount * process.nextCol.dimension.h;

            gridLayer = layers.gridLayer = layers.gridLayer ||
                    paper.group('grid', belowDataset)
                .attr({'clip-rect': [canvasLeft, canvasTop + hH + hGBW,
                    gridEndX, pH - hGBW]});

            gridHeaderLayer = layers.gridHeaderLayer = layers.gridHeaderLayer ||
                    paper.group('grid-header', belowDataset)
                .attr({'clip-rect': [canvasLeft, canvasTop, gridEndX, hH + pH]});

            gridTracker = layers.gridTracker = layers.gridTracker ||
                    paper.group('grid-tracker', belowDataset)
                .attr({'clip-rect': [canvasLeft, canvasTop, gridEndX, hH + pH]});

            gridLayer.data(vFs, 0);
            gridLayer.data(hFs, 0);
            gridTracker.data(vFs, 0);
            gridTracker.data(hFs, 0);

            ganttHeaderLayer = layers.ganttHeaderLayer = layers.ganttHeaderLayer ||
                    paper.group('gantt', aboveDataset)
                .attr({'clip-rect': [startX, canvasTop, visibleW +
                    (hc.verticalScroll.enabled ? hc.scrollOptions.height : 0),
                chart.chartHeight]});

            ganttLayer = layers.dataset
                .attr({'clip-rect': [startX, canvasTop + hH - halfGLT,
                    visibleW, pH + halfGLT]});
            labelsLayer = layers.datalabels
                .attr({'clip-rect': [startX, canvasTop + hH - halfGLT - 10,
                    visibleW, pH + halfGLT + 10]});
            trackerLayer = layers.ganttTracker = paper.group('gantt-hot', layers.tracker)
                .attr({'clip-rect': [startX, canvasTop + hH - halfGLT, visibleW,
                    pH + halfGLT]});

            ganttLayer.data(vFs, 0);
            ganttLayer.data(hFs, 0);
            labelsLayer.data(vFs, 0);
            labelsLayer.data(hFs, 0);
            trackerLayer.data(vFs, 0);
            trackerLayer.data(hFs, 0);

            // Drawing the process grid
            while (process) {
                chart.drawProcess(process);
                process = process.nextRow;
            }

            chart.drawCategories();

            process = hc.dataTable.processHeader;
        },

        drawPlotGantt: function (plot) {
            var chart = this,
                hc = chart.options,
                chartOptions = hc.chart,
                paper = chart.paper,
                layers = chart.layers,
                data = plot.data,
                plotItems = plot.items,
                ln = data.length,
                datasetLayer = layers.dataset,
                labelsLayer = layers.datalabels,
                dataTable = hc.dataTable,
                process = dataTable.processHeader,
                cat = hc.categories,
                axis = cat.axis,

                canvasTop = chart.canvasTop,
                radius = chartOptions.taskBarRoundRadius,
                seriesOptions = hc.plotOptions.series,

                animationDuration = isNaN(+seriesOptions.animation) &&
                        seriesOptions.animation.duration ||
                        seriesOptions.animation * 1000,
                tasksMap = hc.tasksMap || (hc.tasksMap = {}),
                milestn = hc.milestone,
                trend = hc.trendlines,
                pHh = process.dimension.h,
                datePadding = chartOptions.taskDatePadding,
                dashedStyle,
                eventArgs,
                plotItem,
                setElem,
                perComElem,
                slackElem,
                valElem,
                startValElem,
                endValElem,
                path,
                msObj,
                tObj,
                txtAlign,
                setLink,
                toolText,
                tId,
                animation,
                milestoneAnimate,
                halfH,
                items,
                shadowGroup,
                borderFill,
                plotFill,
                width2,
                pObj,
                dataObj,
                pId,
                xPos,
                xPos2,
                yPos,
                width,
                height,
                padding,
                bdr,
                crispBox,
                h,
                i,
                showLabelsLayer,
                perComElemClickHandler,
                perComElemRollOver,
                perComElemRollOut,
                slackElemClickHandler,
                slackElemHandlers,
                milestoneClickHandler,
                milestoneRollOver,
                milestoneRollOut;

            plot.graphics = [];

            shadowGroup = datasetLayer.shadows || (datasetLayer.shadows =
                    paper.group('shadows', datasetLayer));

            // Drawing trendlines
            ln = trend && trend.length;
            for (i = 0; i < ln; i += 1) {
                tObj = trend[i];
                tObj.end || (tObj.end = tObj.start);
                if (tObj.end) {
                    xPos = axis.getPixel(tObj.start);
                    xPos2 = axis.getPixel(tObj.end);
                    width = tObj.thickness;
                    items = tObj.items || (tObj.items = {});
                    dashedStyle = undefined;
                    if (tObj.isTrendZone) {
                        path = [M, xPos + (xPos2 - xPos) * 0.5, canvasTop + pHh,
                            v, (canvasTop + process.totalPH)];
                        width = xPos2 - xPos;
                    } else {
                        path = [M, xPos, canvasTop + pHh, L, xPos2,
                            canvasTop + pHh + process.totalPH];
                        dashedStyle = tObj.dashedStyle;
                    }

                    items.trendLine = paper.path(path, datasetLayer)
                    .attr({
                        stroke: tObj.color,
                        'stroke-width': width,
                        'stroke-dasharray': dashedStyle
                    });

                    if (defined(tObj.displayValue) && tObj.displayValue !== BLANK) {
                        items.label = paper.text(layers.ganttHeaderLayer)
                        .attr({
                            text: tObj.displayValue,
                            x: path[1],
                            y: 0
                        })
                        .css(tObj.style);
                        height = items.label._getBBox().height;

                        yPos = (canvasTop + chartOptions.processHeight) +
                            ((!cat.scroll.enabled || chartOptions.marginBottom < height) ?
                                (height * 0.5) : -(height * 0.5) - GUTTER_5);

                        items.label.attr('y', yPos);
                    }
                }
            }

            labelsLayer.hide();
            showLabelsLayer = function () {
                labelsLayer.show();
            };
            slackElemClickHandler = perComElemClickHandler = function (e) {
                var ele = this;
                plotEventHandler.call(ele, chart, e);
            };
            perComElemRollOver = function (e) {
                var ele = this;
                plotEventHandler.call(ele, chart, e, ROLLOVER);
            };
            perComElemRollOut = function (e) {
                var ele = this;
                plotEventHandler.call(ele, chart, e, ROLLOUT);
            };

            slackElemHandlers = function (ele) {
                ele && ele.click(function (e) {
                    var ele = this;
                    plotEventHandler.call(ele, chart, e);
                })
                .hover(function (data) {
                    var ele = this,
                        dataObj = ele.data('dataObj');
                    plotEventHandler.call(ele, chart, data, ROLLOVER);
                    dataObj.showHoverEffect && chart.taskHoverHandler.call(ele, chart);
                }, function (data) {
                    var ele = this,
                        dataObj = ele.data('dataObj');
                    plotEventHandler.call(ele, chart, data, ROLLOUT);
                    dataObj.showHoverEffect && chart.taskHoverOutHandler.call(ele, chart);
                })
                .data('dataObj', dataObj)
                .data('eventArgs', eventArgs);
            };


            ln = data.length;
            for (i = 0; i < ln; i += 1) {
                dataObj = data[i];
                pId = dataObj.processId;
                pObj = dataTable[pId];
                borderFill = plotFill = dataObj.color;
                items = dataObj.items || (dataObj.items = {});
                animation = dataObj.animation ? (animationDuration || 1000) : 0;

                if (pObj) {
                    bdr = dataObj.borderThickness;
                    xPos = mathRound(axis.getPixel(dataObj.start));
                    width = mathAbs(width2 = axis.getPixel(dataObj.end) - xPos);
                    if (xPos && width) {
                        h = pObj.dimension.h;
                        yPos = pObj.yPos - h;
                        height = (h * (isPercent(dataObj.height) &&
                                toFloat(dataObj.height, 10) * 0.01)) ||
                                pluckNumber(dataObj.height, h);
                        padding = (h * (isPercent(dataObj.topPadding) &&
                                toFloat(dataObj.topPadding, 10) * 0.01)) ||
                                pluckNumber(dataObj.topPadding, h);
                        yPos = (yPos + mathMin(padding, h - height));
                        halfH = height * 0.5;
                        toolText = dataObj.toolText;
                        setLink = dataObj.link;

                        if (!(plotItem = plotItems[i])) {
                            plotItem = plotItems[i] = {
                                index: i,
                                dataLabel: null,
                                start: dataObj.start,
                                end: dataObj.end,
                                startLabel: null,
                                endLabel: null,
                                tracker: null
                            };
                        }

                        dataObj.index = i;
                        tId = pluck(dataObj.id, i);
                        if (tId !== BLANK && tasksMap[tId]) {
                            tasksMap[tId].items = plotItem;
                            tasksMap[tId].x = xPos;
                            tasksMap[tId].y = yPos;
                            tasksMap[tId].h = height;
                            tasksMap[tId].w = width;
                        }

                        setElem = perComElem = slackElem = valElem = startValElem =
                            endValElem = null;

                        if (dataObj.showAsGroup) {
                            if (animation) {
                                setElem = paper.path([M, xPos, yPos], datasetLayer);
                                setElem.animate({
                                    path: [M, xPos, yPos, v, height,
                                    L, xPos + halfH, yPos + halfH, H, xPos + width - halfH,
                                    L, xPos + width, yPos + height, v, -height, H, xPos]
                                }, animation, 'normal', showLabelsLayer);
                            }
                            else {
                                setElem = paper.path([M, xPos, yPos, v, height,
                                    L, xPos + halfH, yPos + halfH, H, xPos + width - halfH,
                                    L, xPos + width, yPos + height, v, -height, H, xPos], datasetLayer);
                                showLabelsLayer && showLabelsLayer();
                            }

                            setElem.attr({
                                fill: borderFill,
                                stroke: dataObj.borderColor,
                                cursor: setLink ? 'pointer' : BLANK,
                                ishot: true,
                                'stroke-width': dataObj.borderThickness
                            })
                            .tooltip(toolText)
                            .shadow(chartOptions.shadow && dataObj.shadow, shadowGroup);

                        } else {
                            if (dataObj.percentComplete !== -1) {
                                width2 = width * dataObj.percentComplete * 0.01;
                                borderFill = TRACKER_FILL;

                                perComElem = items.taskFill = paper.rect(xPos, yPos, 0, height,
                                    0, datasetLayer)
                                .attr({
                                    fill: plotFill,
                                    cursor: setLink ? 'pointer' : BLANK,
                                    ishot: true,
                                    'stroke-width': 0,
                                    width: animation ? 0 : (width2 || 1)
                                })
                                .tooltip(toolText);

                                if (animation) {
                                    perComElem.animate({
                                        width: width2 || 1
                                    }, animation, 'normal');
                                }

                                slackElem = paper.rect(xPos, yPos,
                                    0, height, 0, datasetLayer)
                                .attr({
                                    fill: dataObj.slackColor,
                                    cursor: setLink ? 'pointer' : BLANK,
                                    ishot: true,
                                    'stroke-width': 0,
                                    x: animation ? xPos : (xPos + width2 || 1),
                                    width: animation ? 0 : (width - width2 || 1)
                                })
                                .tooltip(toolText);

                                if (animation) {
                                    slackElem.animate({
                                        x: xPos + width2 || 1,
                                        width: width - width2 || 1
                                    }, animation, 'normal');
                                }
                            }

                            // crisp column
                            crispBox = R.crispBound(xPos, yPos, width, height, bdr);

                            setElem = paper.rect(crispBox.x, crispBox.y,
                                0, crispBox.height, radius, datasetLayer)
                            .attr({
                                fill: borderFill,
                                stroke: dataObj.borderColor,
                                cursor: setLink ? 'pointer' : BLANK,
                                ishot: true,
                                'stroke-width': dataObj.borderThickness,
                                width: animation ? 0 : (crispBox.width || 1)
                            })
                            .tooltip(toolText)
                            .shadow(chartOptions.shadow && dataObj.shadow, shadowGroup);
                            if (animation) {
                                setElem.animate({
                                        width: crispBox.width || 1
                                    }, animation, 'normal', showLabelsLayer);

                            }
                            else {
                                showLabelsLayer && showLabelsLayer();
                            }
                        }

                        if (defined(dataObj.label) && dataObj.label !== BLANK) {
                            txtAlign = dataObj.labelAlign;
                            valElem = paper.text()
                            .attr({
                                text: dataObj.label,
                                x: xPos + (width * xAlign[txtAlign]) + alignGutter[txtAlign],
                                'text-anchor': align[txtAlign],
                                cursor: setLink ? 'pointer' : BLANK,
                                ishot: true,
                                y: (yPos - (pInt(dataObj.style.lineHeight, 10) * 0.5) - chartOptions.taskLabelPadding)
                            })
                            .css(dataObj.style);
                            labelsLayer.appendChild(valElem);
                        }

                        if (defined(dataObj.startDate) && dataObj.startDate !== BLANK) {
                            startValElem = paper.text()
                            .attr({
                                text: dataObj.startDate,
                                x: xPos - 2 - datePadding,
                                y: (yPos + (height * 0.5)),
                                cursor: setLink ? 'pointer' : BLANK,
                                ishot: true,
                                'text-anchor': 'end'
                            })
                            .css(dataObj.style);
                            labelsLayer.appendChild(startValElem);
                        }

                        if (defined(dataObj.endDate) && dataObj.endDate !== BLANK) {
                            endValElem = paper.text()
                            .attr({
                                text: dataObj.endDate,
                                x: xPos  + width + 2 + datePadding,
                                y: (yPos + (height * 0.5)),
                                cursor: setLink ? 'pointer' : BLANK,
                                ishot: true,
                                'text-anchor': 'start'
                            })
                            .css(dataObj.style);
                            labelsLayer.appendChild(endValElem);
                        }

                        plotItem.graphic = setElem;
                        plotItem.percentCompleteGraphic = perComElem;
                        plotItem.slackGraphic = slackElem;
                        plotItem.dataLabel = valElem;
                        plotItem.startLabel = startValElem;
                        plotItem.endLabel = endValElem;

                        eventArgs = {
                            processId: dataObj.processId,
                            taskId: dataObj.id,
                            start: dataObj._start,
                            end: dataObj._end,
                            showAsGroup: dataObj.showAsGroup,
                            sourceType: 'task',
                            percentComplete: (dataObj.percentComplete !== -1) && dataObj.percentComplete
                        };

                        perComElem && perComElem.click(perComElemClickHandler)
                        .hover(perComElemRollOver, perComElemRollOut)
                        .data('eventArgs', eventArgs);

                        slackElem && slackElem.click(slackElemClickHandler)
                        .data('eventArgs', eventArgs);

                        each([setElem, valElem, startValElem, endValElem], slackElemHandlers);
                    }
                }
            }

            milestoneClickHandler = function (e) {
                var ele = this;
                /**
                 * In `Gantt` chart, milestones are an important part of the chart as they allow you to visually
                 * depict any crucial dates on the chart.
                 * This event is fired when a milestone is clicked
                 *
                 * This event is only applicable to Gantt chart.
                 *
                 * @event FusionCharts#milestoneClick
                 *
                 * @param {string} date - The date of the milestone.
                 * @param {string} numSides - The number of sides of the milestone.
                 * @param {string} radius - The radius of the milestone.
                 * @param {string} taskId - The id of the task to which this milestone relates to.
                 * @param {string} toolText - The tooltext that is displayed when hovered over the milestone
                 * @param {number} chartX - x-coordinate of the pointer relative to the chart.
                 * @param {number} chartY - y-coordinate of the pointer relative to the chart.
                 * @param {number} pageX - x-coordinate of the pointer relative to the page.
                 * @param {number} pageY - y-coordinate of the pointer relative to the page.
                 * @see FusionCharts#event:milestoneRollOver
                 * @see FusionCharts#event:milestoneRollOut
                 */
                plotEventHandler.call(ele, chart, e, 'MilestoneClick');
            };

            milestoneRollOver = function (event) {
                var ele = this,
                    dataObj = ele.data('dataObj');

                /**
                 * In `Gantt` chart, milestones are an important part of the chart as they allow you to visually
                 * depict any crucial dates on the chart.
                 * This event is fired when the pointer moves over a milestone
                 *
                 * This event is only applicable to Gantt chart.
                 *
                 * @event FusionCharts#milestoneRollOver
                 *
                 * @param {string} date - The date of the milestone.
                 * @param {string} numSides - The number of sides of the milestone.
                 * @param {string} radius - The radius of the milestone.
                 * @param {string} taskId - The id of the task to which this milestone relates to.
                 * @param {string} toolText - The tooltext that is displayed when hovered over the milestone
                 * @param {number} chartX - x-coordinate of the pointer relative to the chart.
                 * @param {number} chartY - y-coordinate of the pointer relative to the chart.
                 * @param {number} pageX - x-coordinate of the pointer relative to the page.
                 * @param {number} pageY - y-coordinate of the pointer relative to the page.
                 * @see FusionCharts#event:milestoneClick
                 * @see FusionCharts#event:milestoneRollOut
                 */
                plotEventHandler.call(ele, chart, event, 'MilestoneRollOver');

                dataObj.showHoverEffect && dataObj.items.graphic.attr({
                    fill: dataObj.hoverFillColor,
                    stroke: dataObj.hoverBorderColor,
                    'fill-opacity': dataObj.hoverFillAlpha,
                    'stroke-opacity': dataObj.hoverBorderAlpha
                });
            };

            milestoneRollOut = function (event) {
                var ele = this,
                    dataObj = ele.data('dataObj');

                /**
                 * In `Gantt` chart, milestones are an important part of the chart as they allow you to visually
                 * depict any crucial dates on the chart.
                 * This event is fired when the pointer moves out of a milestone
                 *
                 * This event is only applicable to Gantt chart.
                 *
                 * @event FusionCharts#milestoneRollOut
                 *
                 * @param {string} date - The date of the milestone.
                 * @param {string} numSides - The number of sides of the milestone.
                 * @param {string} radius - The radius of the milestone.
                 * @param {string} taskId - The id of the task to which this milestone relates to.
                 * @param {string} toolText - The tooltext that is displayed when hovered over the milestone
                 * @param {number} chartX - x-coordinate of the pointer relative to the chart.
                 * @param {number} chartY - y-coordinate of the pointer relative to the chart.
                 * @param {number} pageX - x-coordinate of the pointer relative to the page.
                 * @param {number} pageY - y-coordinate of the pointer relative to the page.
                 * @see FusionCharts#event:milestoneClick
                 * @see FusionCharts#event:milestoneRollOver
                 */
                plotEventHandler.call(ele, chart, event, 'MilestoneRollOut');

                dataObj.showHoverEffect && dataObj.items.graphic.attr({
                    fill: dataObj.fillColor,
                    stroke: dataObj.borderColor,
                    'fill-opacity': dataObj.fillAlpha,
                    'stroke-opacity': dataObj.borderAlpha
                });
            };



            // Drawing of Connectors
            this.drawConnectors();

            // Drawing of milestone
            items = null;
            ln = milestn && milestn.length;
            for (i = 0; i < ln; i += 1) {
                msObj = milestn[i];
                tObj = tasksMap[msObj.taskId];
                items = msObj.items || (msObj.items = {});

                if (tObj) {
                    // clip-canvas animation to line chart
                    milestoneAnimate = R.animation({
                        'fill-opacity': msObj.fillAlpha,
                        'stroke-opacity': msObj.borderAlpha
                    },
                    animationDuration, 'normal');

                    eventArgs = {
                        sides: msObj.sides,
                        date: msObj.origDate,
                        radius: msObj.radius,
                        taskId: msObj.taskId,
                        toolText: msObj.toolText,
                        numSides: msObj.numSides
                    };

                    items.graphic = paper.polypath(msObj.numSides, axis.getPixel(msObj.date.ms),
                        tObj.y + (tObj.h * 0.5), pluckNumber(msObj.radius, tObj.h * 0.6),
                        msObj.startAngle, msObj.depth, datasetLayer)
                    .attr({
                        fill: msObj.fillColor,
                        'fill-opacity': animationDuration ? 0 : msObj.fillAlpha,
                        stroke: msObj.borderColor,
                        'stroke-opacity': animationDuration ? 0 : msObj.borderAlpha,
                        ishot: true,
                        cursor: msObj.link ? 'pointer' : BLANK,
                        'stroke-width': msObj.borderThickness
                    })
                    .tooltip(msObj.toolText)
                    .click(milestoneClickHandler)
                    .data('eventArgs', eventArgs)
                    .data('dataObj', msObj);

                    if (animationDuration) {
                        items.graphic.animate(milestoneAnimate.delay(animationDuration));
                    }

                    items.graphic.hover(milestoneRollOver, milestoneRollOut);
                }
            }
        },

        taskHoverOutHandler: function (chart) {
            var ele = this,
                tasksMap = chart.options.tasksMap,
                dataObj = ele.data('dataObj'),
                items = tasksMap[pluck(dataObj.id, dataObj.index)].items,
                attrib = {
                    fill: dataObj.color,
                    stroke: dataObj.borderColor,
                    'stroke-width': dataObj.borderThickness,
                    'stroke-dasharray': dataObj.dashedStyle
                };

            if (dataObj.percentComplete !== -1 &&
                    !dataObj.showAsGroup) {
                items.slackGraphic.attr({
                    fill: dataObj.slackColor
                });
                items.percentCompleteGraphic.attr({
                    fill: dataObj.color
                });
                delete attrib.fill;
            }
            items.graphic.attr(attrib);

        },

        taskHoverHandler: function (chart) {
            var ele = this,
                tasksMap = chart.options.tasksMap,
                dataObj = ele.data('dataObj'),
                items = tasksMap[pluck(dataObj.id, dataObj.index)].items,
                attrib = {
                    fill: dataObj.hoverFillColor,
                    stroke: dataObj.hoverBorderColor
                };

            if (dataObj.percentComplete !== -1 &&
                    !dataObj.showAsGroup) {
                items.slackGraphic.attr({
                    fill: dataObj.slackHoverColor
                });
                items.percentCompleteGraphic.attr({
                    fill: dataObj.hoverFillColor
                });
                delete attrib.fill;
            }
            items.graphic.attr(attrib);
        },

        drawConnectors: function () {
            var chart = this,
                paper = chart.paper,
                hc = chart.options,
                chartOpt = hc.chart,
                cExt = chartOpt.connectorExtension,
                con = hc.connectors,
                taskMap = hc.tasksMap,
                ln = con.length,
                datasetLayer = chart.layers.dataset,
                cPath = [],
                seriesOptions = hc.plotOptions.series,
                duration = isNaN(+seriesOptions.animation) &&
                        seriesOptions.animation.duration ||
                        seriesOptions.animation * 1000,
                i,
                tH,
                conObj,
                items,
                isStraightLine,
                dashLength,
                dashGap,
                startTaskId,
                endTaskId,
                stx1,
                stx2,
                etx1,
                etx2,
                stY,
                etY,
                diff,
                cnCase,
                stTObj,
                connectorAnimation,
                endTObj,
                eventArgs,
                connectorClick,
                rollOverHandler,
                rollOutHandler;

            connectorClick = function (e) {
                var ele = this;
                plotEventHandler.call(ele, chart, e, 'ConnectorClick');
            };

            rollOverHandler = function (event) {
                var ele = this,
                    data = ele.data('dataObj'),
                    stTObj = taskMap[data.fromTaskId],
                    endTObj = taskMap[data.toTaskId],
                    attr = {
                        stroke: data.hoverColor,
                        'stroke-dasharray': data.dashedStyle,
                        'stroke-width': data.hoverThickness
                    };

                plotEventHandler.call(ele, chart, event, 'ConnectorRollOver');
                if (data.showHoverEffect) {
                    each([stTObj, endTObj], function (obj) {
                        var attrib = {
                            fill: obj.dataObj.hoverFillColor,
                            stroke: obj.dataObj.hoverBorderColor
                        };
                        if (obj.dataObj.percentComplete !== -1 &&
                                !obj.dataObj.showAsGroup) {
                            obj.items.slackGraphic.attr({
                                fill: obj.dataObj.slackHoverColor
                            });
                            obj.items.percentCompleteGraphic.attr({
                                fill: obj.dataObj.hoverFillColor,
                                stroke: obj.dataObj.hoverBorderColor
                            });
                            delete attrib.fill;
                        }
                        obj.items.graphic.attr(attrib);
                    });
                    data.items.connector.attr(attr);
                }
            };

            rollOutHandler = function (event) {
                var ele = this,
                    data = ele.data('dataObj'),
                    stTObj = taskMap[data.fromTaskId],
                    endTObj = taskMap[data.toTaskId],
                    attr = {
                        stroke: data.color,
                        'stroke-width': data.thickness,
                        'stroke-dasharray': data.dashedStyle
                    };

                plotEventHandler.call(ele, chart, event, 'ConnectorRollOut');

                if (data.showHoverEffect) {
                    each([stTObj, endTObj], function (obj) {
                        var attrib = {
                            fill: obj.dataObj.color,
                            stroke: obj.dataObj.borderColor,
                            'stroke-width': obj.dataObj.borderThickness,
                            'stroke-dasharray': obj.dataObj.dashedStyle
                        };
                        if (obj.dataObj.percentComplete !== -1 &&
                                !obj.dataObj.showAsGroup) {
                            obj.items.slackGraphic.attr({
                                fill: obj.dataObj.slackColor
                            });
                            obj.items.percentCompleteGraphic.attr({
                                fill: obj.dataObj.color
                            });
                            delete attrib.fill;
                        }
                        obj.items.graphic.attr(attrib);
                    });
                    data.items.connector.attr(attr);
                }
            };

            //Iterate through each and draw it
            for (i = 0; i <= ln; i += 1) {
                conObj = con[i] || {};
                startTaskId = conObj.fromTaskId;
                endTaskId = conObj.toTaskId;
                stTObj = taskMap[startTaskId];
                endTObj = taskMap[endTaskId];
                items = conObj.items || (conObj.items = {});
                //If the connector's from and to Id are defined, only then we draw the connector
                if (stTObj && endTObj) {
                    //Y Positions
                    stY = stTObj.y + (stTObj.h * 0.5);
                    etY = endTObj.y + (endTObj.h * 0.5);
                    //Check if the to and from bars are in straight line
                    isStraightLine = (stY == etY);
                    //Dash properties
                    dashLength = 3;
                    dashGap = conObj.isDashed ? (conObj.thickness + 2) : 0;
                    //X Positions
                    stx1 = stTObj.x;
                    stx2 = stTObj.x + stTObj.w;
                    etx1 = endTObj.x;
                    etx2 = endTObj.x + endTObj.w;
                    diff = 0;
                    //There can be four cases if the two tasks are not in straight line
                    cnCase = 0;
                    //cnCase 1: End of StartTask to Start of EndTask
                    if (conObj.fromTaskConnectStart === 0 && conObj.toTaskConnectStart === 1) {
                        cnCase = 1;
                    }
                    //cnCase 2: End of StartTask to End of EndTask
                    if (conObj.fromTaskConnectStart === 0 && conObj.toTaskConnectStart === 0) {
                        cnCase = 2;
                    }
                    //cnCase 3: Start of StartTask to Start of EndTask
                    if (conObj.fromTaskConnectStart === 1 && conObj.toTaskConnectStart === 1) {
                        cnCase = 3;
                    }
                    //cnCase 4: Start of StartTask to End of EndTask
                    if (conObj.fromTaskConnectStart === 1 && conObj.toTaskConnectStart === 0) {
                        cnCase = 4;
                    }


                    if (isStraightLine) {
                        tH = stTObj.height;
                        switch (cnCase) {
                            case 1 :
                                diff = (etx1 - stx2) / 10;
                                cPath = [M, stx2, stY, stx2 + diff, stY,
                                    L, stx2 + diff, stY, stx2 + diff, stY - tH,
                                    L, stx2 + diff, stY - tH, etx1 - diff, stY - tH,
                                    L, etx1 - diff, stY - tH, etx1 - diff, stY,
                                    L, etx1 - diff, stY, etx1, etY,
                                    L, etx2 + cExt, etY, etx2, etY];
                                break;
                            case 2 :
                                cPath = [M, stx2, stY, stx2 + cExt, stY,
                                    L, stx2 + cExt, stY, stx2 + cExt, stY - tH,
                                    L, stx2 + cExt, stY - tH, etx2 + cExt, stY - tH,
                                    L, etx2 + cExt, etY - tH, etx2 + cExt, etY];
                                break;
                            case 3 :
                                cPath = [M, stx1, stY, stx1 - cExt, stY,
                                    L, stx1 - cExt, stY, stx1 - cExt, stY - tH,
                                    L, stx1 - cExt, stY - tH, etx1 - cExt, stY - tH,
                                    L, etx1 - cExt, stY - tH, etx1 - cExt, stY,
                                    L, etx1 - cExt, stY, etx1, stY];

                                break;
                            case 4 :
                                cPath = [M, stx1, stY, stx1 - cExt, stY,
                                    L, stx1 - cExt, stY, stx1 - cExt, stY - tH,
                                    L, stx1 - cExt, stY - tH, etx2 + cExt, stY - tH,
                                    L, etx2 + cExt, stY - tH, etx2 + cExt, stY,
                                    L, etx2 + cExt, stY, etx2, stY];
                                break;
                        }
                    } else {
                        switch (cnCase) {
                            case 1 :
                                cPath = [M, stx2, stY, stx2 + (etx1 - stx2) / 2, stY,
                                   L, stx2 + (etx1 - stx2) / 2, stY, stx2 + (etx1 - stx2) / 2, etY,
                                   L, stx2 + (etx1 - stx2) / 2, etY, etx1, etY];

                                if (stx2 <= etx1) {
                                    cPath = [M, stx2, stY, stx2 + (etx1 - stx2) / 2, stY,
                                        L, stx2 + (etx1 - stx2) / 2, stY, stx2 + (etx1 - stx2) / 2, etY,
                                        L, stx2 + (etx1 - stx2) / 2, etY, etx1, etY];
                                } else {
                                    cPath = [M, stx2, stY, stx2 + cExt, stY,
                                        L, stx2 + cExt, stY, stx2 + cExt, stY + (etY - stY) / 2,
                                        L, stx2 + cExt, stY + (etY - stY) / 2, etx1 - cExt, stY + (etY - stY) / 2,
                                        L, etx1 - cExt, stY + (etY - stY) / 2, etx1 - cExt, etY,
                                        L, etx1 - cExt, etY, etx1, etY];
                                }
                                break;
                            case 2 :
                                diff = ((etx2 - stx2) < 0) ? (0) : (etx2 - stx2);
                                cPath = [M, stx2, stY, stx2 + cExt + diff, stY,
                                    L, stx2 + cExt + diff, stY, stx2 + cExt + diff, etY,
                                    L, stx2 + cExt + diff, etY, etx2, etY];
                                break;
                            case 3 :
                                diff = ((stx1 - etx1) < 0) ? (0) : (stx1 - etx1);
                                cPath = [M, stx1, stY, stx1 - cExt - diff, stY,
                                    L, stx1 - cExt - diff, stY, stx1 - cExt - diff, etY,
                                    L, stx1 - cExt - diff, etY, etx1, etY];
                                break;
                            case 4 :
                                if (stx1 > etx2) {
                                    cPath = [M, stx1, stY, stx1 - (stx1 - etx2) / 2, stY,
                                        L, stx1 - (stx1 - etx2) / 2, stY, stx1 - (stx1 - etx2) / 2, etY,
                                        L, stx1 - (stx1 - etx2) / 2, etY, etx2, etY];
                                } else {
                                    cPath = [M, stx1, stY, stx1 - cExt, stY,
                                        L, stx1 - cExt, stY, stx1 - cExt, stY + (etY - stY) / 2,
                                        L, stx1 - cExt, stY + (etY - stY) / 2, etx2 + cExt, stY + (etY - stY) / 2,
                                        L, etx2 + cExt, stY + (etY - stY) / 2, etx2 + cExt, etY,
                                        L, etx2 + cExt, etY, etx2, etY];
                                }
                                break;
                        }
                    }

                    if (items.connector) {
                        items.connector.animate({
                            path: cPath
                        });
                    } else {
                        // clip-canvas animation to line chart
                        connectorAnimation = R.animation({
                            'stroke-opacity': conObj.alpha
                        },
                        duration, 'normal');

                        // Draw the connector line
                        items.connector = paper.path(cPath, datasetLayer)//datasetLayer)
                        .attr({
                            stroke: conObj.color,
                            'stroke-opacity': 0,
                            'stroke-width': conObj.thickness,
                            'stroke-dasharray': conObj.dashedStyle
                        })
                        .animate(connectorAnimation.delay(duration));
                    }

                    eventArgs = {
                        fromTaskId: conObj.fromTaskId,
                        toTaskId: conObj.toTaskId,
                        fromTaskConnectStart: conObj.fromTaskConnectStart,
                        toTaskConnectStart: conObj.toTaskConnectStart,
                        sourceType: 'connector'
                    };

                    // Draw the connector tracker
                    items.tracker = paper.path(cPath, datasetLayer)
                    .attr({
                        stroke: TRACKER_FILL,
                        'stroke-width': mathMax(conObj.thickness, 10),
                        ishot: true,
                        cursor: conObj.link ? 'pointer' : BLANK
                    })
                    .data('dataObj', conObj)
                    .data('eventArgs', eventArgs)
                    .click(connectorClick);

                    items.tracker.hover(rollOverHandler, rollOutHandler);
                }
            }
        }

    }, renderer['renderer.cartesian']);
}]);
