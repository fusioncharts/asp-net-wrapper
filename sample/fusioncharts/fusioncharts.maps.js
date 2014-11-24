/**
 * @private
 * @module fusioncharts.renderer.javascript.legend-gradient
 */
FusionCharts.register('module', ['private', 'modules.renderer.js-gradientlegend', function() {


        var global = this,
            lib = global.hcLib,
            win = global.window,
            userAgent = win.navigator.userAgent,
            isIE = /msie/i.test(userAgent) && !win.opera,
            pluckNumber = lib.pluckNumber,
            COLOR_BLACK = lib.COLOR_BLACK,
            COLOR_GLASS = lib.COLOR_GLASS,
            FC_CONFIG_STRING = lib.FC_CONFIG_STRING,
            graphics = lib.graphics,
            hsbToRGB = graphics.HSBtoRGB,
            rgbToHSB = graphics.RGBtoHSB,
            rgbToHex = graphics.RGBtoHex,
            hexToRGB = graphics.HEXtoRGB,
            COMMASTRING = lib.COMMASTRING,
            BLANK = lib.BLANKSTRING,
            parseUnsafeString = lib.parseUnsafeString,
            convertColor = lib.graphics.convertColor,
            POSITION_TOP = lib.POSITION_TOP,
            POSITION_MIDDLE = lib.POSITION_MIDDLE,
            POSITION_START = lib.POSITION_START,
            POSITION_END = lib.POSITION_END,
            LEGENDPOINTERDRAGSTART = 'LegendPointerDragStart',
            LEGENDPOINTERDRAGSTOP = 'LegendPointerDragStop',
            LEGENDRANGEUPDATED = 'LegendRangeUpdated',
            getDarkColor = lib.graphics.getDarkColor,
            getLightColor = lib.graphics.getLightColor,
            pluck = lib.pluck,
            getValidValue = lib.getValidValue,
            toRaphaelColor = lib.toRaphaelColor,
            hasTouch = lib.hasTouch,
            M = 'M',
            Z = 'Z',
            L = 'L',
            NONE = 'none',
            mathRound = Math.round,
            mathMax = Math.max,
            mathMin = Math.min,
            mathAbs = Math.abs,
            PERCENTSTRING = '%',
            configureGradientLegendOptions,
            getLabelConfig,
            calcPercent,

            TRACKER_FILL = 'rgba(192,192,192,'+ (isIE ? 0.002 : 0.000001) +')', // invisible but clickable,

            /**
             * Fixes color values by appending hash wherever needed
             */
            dehashify = function(color) {
                return color && color.replace(/^#?([a-f0-9]+)/ig, '$1');
            };

        //for faster execution remove all validation
        // as this function will be called internaly

        function getTransitColor(colorArr1, colorArr2, transitOffset) {
            var R1 = colorArr1[0], G1 = colorArr1[1], B1 = colorArr1[2],
                R = R1 + ((colorArr2[0] - R1) * transitOffset),
                G = G1 + ((colorArr2[1] - G1) * transitOffset),
                B = B1 + ((colorArr2[2] - B1) * transitOffset);
            return {
                hex: (COLOR_BLACK + (R << 16 | G << 8 | B).toString(16)).slice(-6),
                rgb: [R, G, B]
            };
        }


        //sort color arr
        function sortFN(a, b) {
            return a.maxvalue - b.maxvalue;
        }

        function getExtremeColors(color) {
            var hsb = rgbToHSB(color);
            return {
                minRGB: hsbToRGB((hsb[2] = 0, hsb)),
                maxRGB: hsbToRGB((hsb[2] = 100, hsb))
            };
        }

        //ColorRange parser for gradient ColorRange
        function ColorRange(options) {

            var colorRange = options.colorRange || {},
                dataMin = options.dataMin,
                dataMax = options.dataMax,
                autoOrderLegendIcon = options.sortLegend || false,
                mapByCategory = options.mapByCategory || false,
                defaultColor = options.defaultColor,
                numberFormatter = options.numberFormatter,
                color = colorRange.color,
                colorArr = this.colorArr = [],
                range,
                valueRange,
                colorCount,
                i,
                j,
                lastLostColorIndex,
                code,
                colorObj,
                colorObj2,
                maxValue,
                minValue,
                color1,
                color2,
                baseColor,
                lastValue,
                colorLabel,
                extremeColors;

            this.mapByCategory = mapByCategory;
            // if map by percent
            if (colorRange.mapbypercent === '1') {
                //set the mapbypercent flag
                this.mapbypercent = true;
            }

            // if color range in gradient
            if (colorRange.gradient === '1' && !mapByCategory) {

                this.gradient = true;
                code = dehashify(pluck(colorRange.startcolor, colorRange.mincolor,
                    colorRange.code));

                baseColor = hexToRGB(dehashify(pluck(code, defaultColor,
                    'CCCCCC')));
                //get the scale min value
                lastValue = this.scaleMin = pluckNumber(colorRange.startvalue,
                    colorRange.minvalue, this.mapbypercent ? 0 : dataMin);
                //add the scale start color
                colorArr.push({
                    code: code,
                    maxvalue: lastValue,
                    label: parseUnsafeString(colorRange.startlabel),
                    codeRGB: hexToRGB(code)
                });

                if (color && (colorCount = color.length)) {
                    for (i = 0; i < colorCount; i += 1) {
                        colorObj = color[i];
                        code = dehashify(pluck(colorObj.color, colorObj.code));
                        maxValue = pluckNumber(colorObj.value, colorObj.maxvalue);
                        minValue = pluckNumber(colorObj.minvalue);
                        //add valid color
                        if (maxValue > lastValue) {
                            colorArr.push({
                                code: code,
                                maxvalue: maxValue,
                                userminvalue: minValue,
                                label: parseUnsafeString(pluck(colorObj.label,
                                    colorObj.displayvalue)),
                                codeRGB: hexToRGB(code)
                            });
                        }
                    }
                }

                //now sort the valid array
                colorArr.sort(sortFN);

                colorCount = colorArr.length;
                for (i = 1; i < colorCount; i += 1) {
                    colorObj = colorArr[i];
                    valueRange = colorObj.maxvalue - lastValue;
                    if (valueRange > 0) {
                        colorObj.minvalue = lastValue;
                        colorObj.range = valueRange;
                        lastValue = colorObj.maxvalue;
                    }
                    else {
                        colorArr.splice(i, 1);
                        i -= 1;
                        colorCount -= 1;
                    }
                }
                if (colorArr.length >= 2) {
                    this.scaleMax = lastValue;
                    colorArr[i - 1].label = pluck(colorRange.endlabel,
                        colorArr[i - 1].label, colorArr[i - 1].displayvalue);
                }

                //derive the last color stop in case no user-defined range is found.
                if (colorArr.length === 1) {
                    maxValue = pluckNumber(colorRange.maxvalue,
                        this.mapbypercent ? 100 : dataMax);
                    colorArr.push({
                        minvalue: lastValue,
                        maxvalue: maxValue,
                        range: maxValue - lastValue,
                        label: colorRange.endlabel
                    });
                    this.scaleMax = maxValue;
                    delete colorArr[0].code;
                }

                // Set values of start and end color in case they are not
                // defined by user or could not be derived from a default value.
                color1 = colorArr[0]; // start
                color2 = colorArr[colorArr.length - 1]; // end
                if (!color1.code || !color2.code) {
                    extremeColors = getExtremeColors(baseColor);
                    if (!color1.code) {
                        color1.codeRGB = extremeColors.minRGB;
                        color1.code = rgbToHex(extremeColors.minRGB);
                    }
                    if (!color2.code) {
                        color2.codeRGB = extremeColors.maxRGB;
                        color2.code = rgbToHex(extremeColors.maxRGB);
                    }
                }

                // For color stops that does not have a valid color defined, we
                // would need to insert a placeholder-color at that point.
                colorCount = colorArr.length;
                for (i = 1; i < colorCount; i += 1) {
                    colorObj = colorArr[i];

                    if (!colorObj.code) {
                        lastLostColorIndex = lastLostColorIndex || i;
                    }
                    else {
                        if (lastLostColorIndex) {
                            color2 = colorObj;
                            minValue = color1.maxvalue;
                            range = color2.maxvalue - minValue;
                            for (j = lastLostColorIndex; j < i; j += 1) {
                                colorObj2 = colorArr[j];
                                code = getTransitColor(color1.codeRGB,
                                    color2.codeRGB, (colorObj2.maxvalue - minValue) / range);

                                colorObj2.code = code.hex;
                                colorObj2.codeRGB = code.rgb;
                            }
                        }
                        lastLostColorIndex = null;
                        color1 = colorObj;
                    }
                }

                if (this.scaleMin === undefined || this.scaleMax === undefined) {
                    this.noValidRange = true;
                }
            }
            else { //non gradient color range

                if (color && (colorCount = color.length)) {
                    for (i = 0; i < colorCount; i += 1) {
                        colorObj = color[i];
                        code = pluck(colorObj.color, colorObj.code);
                        maxValue = pluckNumber(colorObj.maxvalue);
                        minValue = pluckNumber(colorObj.minvalue);
                        colorLabel = pluck(colorObj.label,
                            colorObj.displayvalue,
                            mapByCategory ? BLANK : (
                            numberFormatter.dataLabels(minValue) + ' - ' +
                            numberFormatter.dataLabels(maxValue)));
                        //add valid color
                        if (code && maxValue > minValue || (mapByCategory && colorLabel)) {
                            colorArr.push({
                                code: code,
                                maxvalue: maxValue,
                                minvalue: minValue,
                                label: parseUnsafeString(colorLabel),
                                labelId: colorLabel.toLowerCase()
                            });
                        }
                    }


                    if (colorArr.length) {
                        if (autoOrderLegendIcon) {//arrange the colors
                            colorArr.sort(sortFN);
                        }
                    }
                    else {
                        this.noValidRange = true;
                    }
                }
            }

        }
        ColorRange.prototype = {
            getColorObj: function(value) {
                var colorArr = this.colorArr,
                    i = this.gradient ? 1 : 0,
                    colorObj = colorArr[i],
                    lastMatchIndex,
                    transitOffset;



                //if gradient legend the get the transition color
                if (this.mapByCategory) {
                    value = parseUnsafeString(value).toLowerCase();
                    while (colorObj) {
                        if (colorObj.labelId === value) {
                            return {
                                code: colorObj.code,
                                seriesIndex: i
                            };
                        }
                        i += 1;
                        colorObj = colorArr[i];
                    }
                    //outof range value
                    return {
                        outOfRange: true
                    };
                }
                else if (this.gradient) {
                    //within range
                    //return the color code
                    if (this.scaleMin <= value && this.scaleMax >= value) {
                        while (colorObj && colorObj.maxvalue < value) {
                            i += 1;
                            colorObj = colorArr[i];
                        }
                        transitOffset = (value - colorObj.minvalue) / colorObj.range;
                        return {
                            code: getTransitColor(colorArr[i - 1].codeRGB, colorObj.codeRGB, transitOffset).hex
                        };
                    }
                    else {//outof range value
                        return {
                            outOfRange: true
                        };
                    }
                }
                else {
                    while (colorObj) {
                        if (colorObj.maxvalue > value && colorObj.minvalue <= value) {
                            return {
                                code: colorObj.code,
                                seriesIndex: i
                            };
                        }
                        if (colorObj.maxvalue === value) {
                            lastMatchIndex = i;
                        }
                        i += 1;
                        colorObj = colorArr[i];
                    }
                    //last range will include end limit
                    colorObj = colorArr[lastMatchIndex];
                    if (colorObj && colorObj.maxvalue === value) {
                        return {
                                code: colorObj.code,
                                seriesIndex: lastMatchIndex
                            };
                    }

                    //outof range value
                    return {
                        outOfRange: true
                    };
                }
            }
        };
        ColorRange.prototype.constructor = ColorRange;

        lib.colorRange = ColorRange;

        /***********************************/
        /*  gradient Legend Space manager  */
        /***********************************/

        /* helper functions */

        //scale labe creater function
        function getScaleLabel(value, isPercent) {
            if (isPercent) {
                return (mathRound(value * 100) / 100) + PERCENTSTRING;
            }
            else {
                return getValidValue(value, BLANK).toString();
            }
        }

        configureGradientLegendOptions = lib.configureGradientLegendOptions = function(hcJSON, fcJSON) {
            var legendObj = hcJSON.legend,
                fcJSONChart = fcJSON.chart;

            legendObj.legendSliderBorderWidth = pluckNumber(fcJSONChart.legendpointerborderthickness, 1);
            legendObj.legendSliderBorderColor = convertColor(pluck(fcJSONChart.legendpointerbordercolor,
                COLOR_BLACK), pluckNumber(fcJSONChart.legendpointerborderalpha, 100));
            legendObj.legendSliderWidth = pluckNumber(fcJSONChart.legendpointerwidth,
                fcJSONChart.legendpointerswidth, 12);
            //default value changed to look same in case of right position
            legendObj.legendSliderHeight = pluckNumber(fcJSONChart.legendpointerheight,
                fcJSONChart.legendpointersheight, 12);
            /** @todo ColorBoxBorder should be customizable */
            legendObj.legendColorBoxBorderColor = legendObj.borderColor;
            legendObj.legendColorBoxBorderWidth = legendObj.borderWidth;

            legendObj.legendScaleColor = convertColor(pluck(fcJSONChart.legendscalelinecolor,
                COLOR_BLACK), pluckNumber(fcJSONChart.legendscalelinealpha, 100));
            legendObj.legendScalePadding = pluckNumber(fcJSONChart.legendscalepadding, 4);
            legendObj.legendScaleLineThickness = pluckNumber(fcJSONChart.legendscalelinethickness, 1);
            legendObj.legendScaleTickDistance = pluckNumber(fcJSONChart.legendscaletickdistance, 6);
            //remove defaulr hand pointer
            legendObj.itemStyle.cursor = 'default';
            legendObj.interActivity = pluckNumber(fcJSONChart.interactivelegend, 1);
        };

        lib.placeGLegendBlockRight = function(hcJSON, fcJSON, availableWidth, availableHeight, isPointItem) {
            // configure LegendOptions
            this.configureLegendOptions(hcJSON, fcJSON.chart, true, isPointItem, availableWidth);

            //gradiend speciffic options
            configureGradientLegendOptions(hcJSON, fcJSON);

            var iapi = this,
                snapLiterals = iapi.snapLiterals || (iapi.snapLiterals = {}),
                conf = hcJSON[FC_CONFIG_STRING],
                smartLabel = iapi.smartLabel || conf.smartLabel,
                legendObj = hcJSON.legend,
                chartObj = hcJSON.chart,
                spacingRight = chartObj.spacingRight,
                smartText,
                smartSText,
                textPadding = legendObj.textPadding = 2,
                textPadding2 = textPadding * 2,
                captionPadding = legendObj.title.padding,
                captionWidth = 0,
                legendCaptionHeight = 0,
                padding = legendObj.padding,
                padding2 = 2 * padding,
                usedWidth = pluckNumber(fcJSON.chart.legendpadding, 7) +
                (legendObj.borderWidth / 2) + 1,
                colorRange = hcJSON.colorRange || {},
                colorArr = colorRange.colorArr,
                mapbypercent = colorRange.mapbypercent,
                scaleMax = colorRange.scaleMax,
                scaleMin = colorRange.scaleMin,
                scaleRange = scaleMax - scaleMin,
                legendSliderWidth = legendObj.legendSliderWidth,
                legendSliderHeight = legendObj.legendSliderHeight,
                legendSliderHalfHeight = legendSliderHeight / 2,
                legendScalePadding = legendObj.legendScalePadding,
                legendScaleTickDistance = legendObj.legendScaleTickDistance,
                style = legendObj.itemStyle || {},
                lineHeight = pluckNumber(parseInt(style.lineHeight, 10) || 12),
                textYAdjuster = lineHeight * 0.75,
                effectiveWidth = availableWidth - padding2,
                i,
                colorCount,
                colorObj,
                maxTextHeight,
                labelMaxWidth,
                allowedMaxSLWidth,
                halfLabelHeight,
                boxHeight,
                labelStartY = 0,
                labelEndY,
                labelW,
                scaleLabelStartY,
                scaleLabelEndY,
                scaleLabelW,
                labelLastIndex,
                pixelValueRatio,
                positionY,
                extraHeight,
                allowedMaxHeight,
                allowedMaxSLHeight,
                labelHalfWidth,
                scaleLabelHalfHeight,
                laxtColorObj;



            availableHeight -= padding2;//deduct the legend Box padding 2 * 6Px

            if (!colorRange.noValidRange && colorArr && (colorCount = colorArr.length) > 1) {
                labelLastIndex = colorCount - 1;

                //caption
                if (legendObj.title.text !== BLANK) {
                    smartLabel.setStyle(legendObj.title.style);
                    smartText = smartLabel.getSmartText(legendObj.title.text, effectiveWidth, mathMax(lineHeight,
                        availableHeight / 4));
                    legendObj.title.text = smartText.text;
                    captionWidth = smartText.width + padding2;
                    availableHeight -= legendCaptionHeight = smartText.height + captionPadding;
                }

                //set the style for non caption labels
                smartLabel.setStyle(style);
                lineHeight = smartLabel.lineHeight;

                effectiveWidth -= legendScaleTickDistance + legendScalePadding + legendSliderWidth;
                legendObj.colorBoxX = legendSliderWidth;

                allowedMaxSLWidth = mathMax(lineHeight, effectiveWidth / 2);
                labelMaxWidth = mathMin(effectiveWidth - allowedMaxSLWidth - 4, lineHeight);//boothside padding for text

                allowedMaxSLHeight = mathMax(lineHeight, availableHeight / 2);
                allowedMaxHeight = availableHeight / 4; //boothside padding for text

                ////////////////firstLabel///////////
                colorObj = colorArr[0];
                //create the scale label
                colorObj.scaleLabel = getScaleLabel(colorObj.maxvalue, mapbypercent);

                //calculate the space
                smartText = smartLabel.getSmartText(colorObj.label, allowedMaxHeight, labelMaxWidth);
                colorObj.label = smartText.text;
                labelW = smartText.height;
                colorObj.labelY = textYAdjuster - smartText.height / 2;

                smartSText = smartLabel.getSmartText(colorObj.scaleLabel, allowedMaxSLWidth, allowedMaxSLHeight);
                colorObj.scaleLabel = smartSText.text;
                scaleLabelStartY = smartSText.height / 2;
                scaleLabelW = smartSText.width;
                colorObj.scaleLabelY = textYAdjuster - smartSText.height / 2;

                //set the box StartX
                legendObj.colorBoxY = mathMax(scaleLabelStartY, smartText.width + textPadding2,
                    legendSliderHalfHeight) + legendCaptionHeight;

                //////////////lastLabel//////////////
                colorObj = laxtColorObj = colorArr[labelLastIndex];
                //create the scale label
                colorObj.scaleLabel = getScaleLabel(colorObj.maxvalue, mapbypercent);

                //calculate the space
                smartText = smartLabel.getSmartText(colorObj.label, allowedMaxHeight, labelMaxWidth);
                colorObj.label = smartText.text;
                labelW = mathMax(labelW, smartText.height);
                colorObj.labelY = textYAdjuster - smartText.height / 2;

                smartSText = smartLabel.getSmartText(colorObj.scaleLabel, allowedMaxSLWidth, allowedMaxSLHeight);
                colorObj.scaleLabel = smartSText.text;
                scaleLabelW = mathMax(scaleLabelW, smartSText.width);
                halfLabelHeight = smartSText.height / 2;
                maxTextHeight = mathMax(smartText.width + textPadding2, halfLabelHeight, legendSliderHalfHeight);
                colorObj.scaleLabelY = textYAdjuster - smartSText.height / 2;
                //set the box Width
                legendObj.colorBoxHeight = boxHeight = availableHeight - legendObj.colorBoxY - maxTextHeight;

                labelEndY = boxHeight;
                scaleLabelEndY = boxHeight - halfLabelHeight;

                pixelValueRatio = boxHeight / scaleRange;

                extraHeight = mathMin(labelEndY - labelStartY, scaleLabelEndY - scaleLabelStartY) - 4;
                //create scaleLabel for all colorObj
                for (i = 1; i < labelLastIndex; i += 1) {
                    colorObj = colorArr[i];
                    positionY = (colorObj.maxvalue - scaleMin) * pixelValueRatio;

                    //calculate the space
                    smartText = smartLabel.getSmartText(colorObj.label, mathMin(positionY -
                        labelStartY, labelEndY - positionY) * 2, labelMaxWidth);
                    colorObj.label = smartText.text;
                    labelW = mathMax(labelW, smartText.height);
                    colorObj.labelY = textYAdjuster - smartText.height / 2;
                    labelHalfWidth = smartText.width / 2;

                    //create the scale label
                    colorObj.scaleLabel = getScaleLabel(colorObj.maxvalue, mapbypercent);
                    //calculate the space
                    smartSText = smartLabel.getSmartText(colorObj.scaleLabel, allowedMaxSLWidth, mathMin(positionY -
                        scaleLabelStartY, scaleLabelEndY - positionY) * 2);
                    colorObj.scaleLabel = smartSText.text;
                    scaleLabelW = mathMax(scaleLabelW, smartSText.width);
                    scaleLabelHalfHeight = smartSText.height / 2;
                    colorObj.scaleLabelY = textYAdjuster - smartSText.height / 2;

                    extraHeight = mathMin(extraHeight, (positionY - mathMax(scaleLabelHalfHeight +
                        scaleLabelStartY, labelHalfWidth + labelStartY) - 4) * scaleRange / colorObj.range);

                    labelStartY = labelHalfWidth + positionY;
                    scaleLabelStartY = scaleLabelHalfHeight + positionY;

                }

                //calculate the extraSPace  for last gap
                //gradient box should be at least aprox 50 % width
                extraHeight = mathMax(mathMin(extraHeight, (mathMin(scaleLabelEndY - scaleLabelStartY,
                    labelEndY - labelStartY) - 4) * scaleRange / laxtColorObj.range, availableHeight * 0.3), 0);

                legendObj.colorBoxHeight -= extraHeight;

                //add text padding
                //default 15
                legendObj.colorBoxWidth = (labelW && labelW + textPadding2) || 15;

                //determine legend width
                legendObj.height = legendObj.totalHeight = availableHeight +
                    legendCaptionHeight + padding2 - extraHeight;

                legendObj.width = (scaleLabelW && scaleLabelW + textPadding) +
                    legendObj.colorBoxWidth + legendSliderWidth +
                    legendObj.legendScaleTickDistance + legendObj.legendScalePadding + padding2;

                //if the caption width has gretter width
                if (legendObj.width < captionWidth) {
                    legendObj.colorBoxX += (captionWidth - legendObj.width) / 2;
                    legendObj.width = captionWidth;
                }

                //NOTE: no scroll bar. worst case scale labels are not fully visible

                if (legendObj.width > availableWidth) { // for padding
                    legendObj.width = availableWidth;
                }

                //add anotation macro
                snapLiterals.legendstartx = conf.width - spacingRight - legendObj.width;
                snapLiterals.legendwidth = legendObj.width;
                snapLiterals.legendendx = snapLiterals.legendstartx + snapLiterals.legendwidth;
                snapLiterals.legendheight = legendObj.height;

                usedWidth += legendObj.width;
                hcJSON.chart.marginRight += usedWidth;
                return usedWidth;
            }
            else {
                legendObj.enabled = false;
                return 0;
            }
        };


        /** @todo create a single function to calculate the text & scale label space for all colorObj */
        lib.placeGLegendBlockBottom = function(hcJSON, fcJSON, availableWidth, availableHeight, isPointItem) {
            //configure LegendOptions
            this.configureLegendOptions(hcJSON, fcJSON.chart, false, isPointItem, availableWidth);
            //gradiend speciffic options
            configureGradientLegendOptions(hcJSON, fcJSON);

            var iapi = this,
                snapLiterals = iapi.snapLiterals || (iapi.snapLiterals = {}),
                conf = hcJSON[FC_CONFIG_STRING],
                smartLabel = iapi.smartLabel || conf.smartLabel,
                legendObj = hcJSON.legend,
                chartObj = hcJSON.chart,
                spacingBottom = chartObj.spacingBottom,
                spacingLeft = chartObj.spacingLeft,
                spacingRight = chartObj.spacingRight,
                smartText,
                smartSText,
                textPadding = legendObj.textPadding = 2,
                captionPadding = legendObj.title.padding,
                captionWidth = 0,
                legendCaptionHeight = 0,
                padding = legendObj.padding,
                padding2 = 2 * padding,
                usedHeight = pluckNumber(fcJSON.chart.legendpadding, 7) +
                (legendObj.borderWidth / 2) + 1,
                colorRange = hcJSON.colorRange || {},
                colorArr = colorRange.colorArr,
                mapbypercent = colorRange.mapbypercent,
                scaleMax = colorRange.scaleMax,
                scaleMin = colorRange.scaleMin,
                scaleRange = scaleMax - scaleMin,
                legendSliderWidth = legendObj.legendSliderWidth,
                legendSliderHeight = legendObj.legendSliderHeight,
                legendScalePadding = legendObj.legendScalePadding,
                legendScaleTickDistance = legendObj.legendScaleTickDistance,
                style = legendObj.itemStyle || {},
                lineHeight = pluckNumber(parseInt(style.lineHeight, 10) || 12),
                textYAdjuster = lineHeight * 0.75,
                effectiveHeight = availableHeight - padding2,
                i,
                colorCount,
                colorObj,
                maxTextWidth,
                labelMaxWidth,
                labelMaxWidth2,
                halfLabelWidth,
                boxWidth,
                labelStartX = 0,
                labelEndX,
                labelH,
                scaleLabelStartX,
                scaleLabelEndX,
                scaleLabelH,
                labelLastIndex,
                pixelValueRatio,
                positionX,
                extraWidth,
                allowedMaxHeight,
                allowedMaxSLHeight,
                labelHalfWidth,
                scaleLabelHalfWidth,
                lastColorObj;



            availableWidth -= padding2;//deduct the legend Box padding 2 * 6Px

            if (!colorRange.noValidRange && colorArr && (colorCount = colorArr.length) > 1) {
                labelLastIndex = colorCount - 1;

                //caption
                if (legendObj.title.text !== BLANK) {
                    smartLabel.setStyle(legendObj.title.style);
                    smartText = smartLabel.getSmartText(legendObj.title.text, availableWidth, effectiveHeight / 3);
                    legendObj.title.text = smartText.text;
                    captionWidth = smartText.width + padding2;
                    effectiveHeight -= legendCaptionHeight = smartText.height + captionPadding;
                }

                //set the style for non caption labels
                smartLabel.setStyle(style);
                lineHeight = smartLabel.lineHeight;

                effectiveHeight -= legendScaleTickDistance + legendScalePadding + legendSliderHeight;
                allowedMaxSLHeight = mathMax(lineHeight, effectiveHeight / 2);
                //boothside padding for text
                allowedMaxHeight = mathMin(effectiveHeight - allowedMaxSLHeight - 4, lineHeight);

                ////////////////firstLabel///////////
                labelMaxWidth = availableWidth / 4;
                labelMaxWidth2 = labelMaxWidth * 2;

                colorObj = colorArr[0];
                //create the scale label
                colorObj.scaleLabel = getScaleLabel(colorObj.maxvalue, mapbypercent);

                //calculate the space
                smartText = smartLabel.getSmartText(colorObj.label, labelMaxWidth, allowedMaxHeight);
                colorObj.label = smartText.text;
                //labelStartX = smartLabel.width / 2;
                labelH = smartText.height;
                colorObj.labelY = textYAdjuster - smartText.height / 2;

                smartSText = smartLabel.getSmartText(colorObj.scaleLabel, labelMaxWidth2, allowedMaxSLHeight);
                colorObj.scaleLabel = smartSText.text;
                scaleLabelStartX = smartSText.width / 2;
                scaleLabelH = smartSText.height;

                if (!colorObj.code) {
                    colorObj.code = pluck(legendObj.minColor, 'CCCCCC');
                }

                //set the box StartX
                legendObj.colorBoxX = mathMax(scaleLabelStartX, smartText.width + textPadding, legendSliderWidth);

                //distribute extraSpace
                //labelMaxWidth = availableWidth - maxTextWidth;

                //////////////lastLabel//////////////
                colorObj = lastColorObj = colorArr[labelLastIndex];
                //create the scale label
                colorObj.scaleLabel = getScaleLabel(colorObj.maxvalue, mapbypercent);

                //calculate the space
                smartText = smartLabel.getSmartText(colorObj.label, labelMaxWidth, allowedMaxHeight);
                colorObj.label = smartText.text;
                labelH = mathMax(labelH, smartText.height);
                colorObj.labelY = textYAdjuster - smartText.height / 2;

                smartSText = smartLabel.getSmartText(colorObj.scaleLabel, labelMaxWidth2, allowedMaxSLHeight);
                colorObj.scaleLabel = smartSText.text;
                scaleLabelH = mathMax(scaleLabelH, smartSText.height);
                halfLabelWidth = smartSText.width / 2;
                maxTextWidth = mathMax(smartText.width + textPadding, halfLabelWidth, legendSliderWidth);
                //set the box Width
                legendObj.colorBoxWidth = boxWidth = availableWidth - legendObj.colorBoxX - maxTextWidth;

                labelEndX = boxWidth;
                scaleLabelEndX = boxWidth - halfLabelWidth;

                pixelValueRatio = boxWidth / scaleRange;

                extraWidth = mathMin(labelEndX - labelStartX, scaleLabelEndX - scaleLabelStartX) - 4;
                //create scaleLabel for all colorObj
                for (i = 1; i < labelLastIndex; i += 1) {
                    colorObj = colorArr[i];
                    positionX = (colorObj.maxvalue - scaleMin) * pixelValueRatio;

                    //calculate the space
                    smartText = smartLabel.getSmartText(colorObj.label, mathMin(positionX -
                        labelStartX, labelEndX - positionX) * 2, allowedMaxHeight);
                    colorObj.label = smartText.text;
                    labelH = mathMax(labelH, smartText.height);
                    colorObj.labelY = textYAdjuster - smartText.height / 2;
                    labelHalfWidth = smartText.width / 2;

                    //create the scale label
                    colorObj.scaleLabel = getScaleLabel(colorObj.maxvalue, mapbypercent);
                    //calculate the space
                    smartSText = smartLabel.getSmartText(colorObj.scaleLabel, mathMin(positionX -
                        scaleLabelStartX, scaleLabelEndX - positionX) * 2, allowedMaxSLHeight);
                    colorObj.scaleLabel = smartSText.text;
                    scaleLabelH = mathMax(scaleLabelH, smartSText.height);
                    scaleLabelHalfWidth = smartSText.width / 2;

                    extraWidth = mathMin(extraWidth, (positionX - mathMax(scaleLabelHalfWidth +
                        scaleLabelStartX, labelHalfWidth + labelStartX) - 4) * scaleRange / colorObj.range);

                    labelStartX = labelHalfWidth + positionX;
                    scaleLabelStartX = scaleLabelHalfWidth + positionX;

                }

                //calculate the extraSPace  for last gap
                //gradient box should be at least aprox 50 % width
                extraWidth = mathMax(mathMin(extraWidth, (mathMin(scaleLabelEndX - scaleLabelStartX,
                    labelEndX - labelStartX) - 4) * scaleRange / lastColorObj.range, availableWidth * 0.3), 0);

                legendObj.colorBoxWidth -= extraWidth;

                //determine legend width
                legendObj.width = availableWidth + padding2 - extraWidth;
                //if the caption width has gretter width
                if (legendObj.width < captionWidth) {
                    legendObj.colorBoxX += (captionWidth - legendObj.width) / 2;
                    legendObj.width = captionWidth;
                }

                legendObj.colorBoxY = legendCaptionHeight + legendSliderHeight;
                //add text padding
                //default 15
                legendObj.colorBoxHeight = (labelH && labelH + (2 * textPadding)) || 15;

                legendObj.height = legendObj.totalHeight = (scaleLabelH && scaleLabelH + textPadding) +
                    legendObj.colorBoxHeight + legendCaptionHeight + legendSliderHeight +
                    legendObj.legendScaleTickDistance + legendObj.legendScalePadding + padding2;

                //NOTE: no scroll bar. worst case scale labels are not fully visible

                if (legendObj.height > availableHeight) { // for padding
                    legendObj.height = availableHeight;
                }

                //add anotation macro
                snapLiterals.legendstartx = spacingLeft + ((conf.width - spacingLeft - spacingRight -
                        legendObj.width) * 0.5) + (legendObj.x || 0);
                snapLiterals.legendwidth = legendObj.width;
                snapLiterals.legendendx = snapLiterals.legendstartx  + snapLiterals.legendwidth;
                snapLiterals.legendstarty = conf.height - spacingBottom - legendObj.height;
                snapLiterals.legendheight = legendObj.height;
                snapLiterals.legendendy = snapLiterals.legendstarty  + snapLiterals.legendheight;


                usedHeight += legendObj.height;
                hcJSON.chart.marginBottom += usedHeight;
                return usedHeight;
            }
            else {
                legendObj.enabled = false;
                return 0;
            }
        };




        /******************************/
        /*       Gradient Legend      */
        /******************************/

        //helper function
        getLabelConfig = function() {
            return {
                point: this
            };
        };
        calcPercent = function(num) {
            return mathRound(num * 100) / 100;
        };



        lib.rendererRoot.drawGradientLegendItem = function(legend) {
            var chart = this,
                paper = chart.paper,
                options = chart.options,
                // legend = this,
                plotLeft = chart.canvasLeft,
                plotTop = chart.canvasTop,
                plotWidth = chart.canvasWidth,
                plotHeight = chart.canvasHeight,
                colorRange = options.colorRange,
                colorArr, i, ln, colorObj,
                //conf = legend.conf,
                legendOptions = options.legend,
                padding = pluckNumber(legendOptions.padding, 4),
                //renderer = legend.renderer,
                itemStyle = legendOptions.itemStyle,
                symbolStyle = legendOptions.symbolStyle,
                interActivity = legendOptions.interActivity,
                elements = legend.elements,
                elementGroup = elements.elementGroup.trackTooltip(true),
                isVertical = legendOptions.layout === 'vertical',
                itemX, itemY, min, max, range,
                itemX1, itemY1,
                itemValuePercent, lastPosition = 0,
                lighting3d = legendOptions.lighting3d,
                glassW = legendOptions.colorBoxWidth,
                glassH = legendOptions.colorBoxHeight,
                boxX = legendOptions.colorBoxX,
                boxY = legendOptions.colorBoxY,
                boxW = glassW,
                boxH = glassH,
                sTW, // sliderTrackerWidth
                sTH, // sliderTrackerHeight

                //allItems = legend.allItems,
                boxFill = {
                FCcolor: {
                    color: BLANK,
                    alpha: BLANK,
                    angle: 0,
                    ratio: BLANK
                }
            },
            FCcolor = boxFill.FCcolor,
                startX = boxX + padding,
                startY = boxY + padding,
                scaleTextX, scaleTextY, labelTextX, labelTextY, scaleY, scaleX1, scaleY1,
                colorBoxBorderCOlor = legendOptions.legendColorBoxBorderColor,
                colorBoxBorderWidth = legendOptions.legendColorBoxBorderWidth,
                textPadding = 2,
                scalePath = [M],
                legendScaleColor = legendOptions.legendScaleColor,
                legendScalePadding = legendOptions.legendScalePadding,
                legendScaleLineThickness = legendOptions.legendScaleLineThickness,
                scaleCrispAdjuster = (legendScaleLineThickness % 2) / 2,
                legendScaleTickDistance = legendOptions.legendScaleTickDistance,
                legendSliderWidth = legendOptions.legendSliderWidth,
                legendSliderHeight = legendOptions.legendSliderHeight,
                heightHalf = boxH / 2,
                widthHalf = boxW / 2,
                sliderWidthHalf = legendSliderWidth / 2,
                sliderHeightHalf = legendSliderHeight / 2,
                sliderPath, sliderEffectPath,
                x1, x2, x3, x4, x5, x6, x7, y1, y2, y3, y4, y5, y6, y7,
                labelPosition, lastIndex, scaleX,
                rotation = 0,
                sliderX, sliderY, sliderW, sliderH,
                sliderColor = 'ABABAB', //should be given by user
                sliderAlpha = 100, //should be given by user
                sliderFillColorShade1 = getLightColor(sliderColor, 50),
                sliderFillColorShade2 = getDarkColor(sliderColor, 70),
                sliderFill = convertColor(sliderColor, sliderAlpha), /*{
                 FCcolor : {
                 color : sliderFillColorShade1 + COMMASTRING + sliderFillColorShade2 +
                 COMMASTRING + sliderFillColorShade2 + COMMASTRING + sliderFillColorShade1,
                 alpha : sliderAlpha + COMMASTRING + sliderAlpha + COMMASTRING +
                 sliderAlpha + COMMASTRING + sliderAlpha,
                 ratio : '0,45,10,45',
                 angle : 0
                 }
                 },*/
                sliderBorderColor = convertColor(sliderFillColorShade2, sliderAlpha),
                sliderEffectColor = convertColor(sliderFillColorShade1, sliderAlpha),
                sliderBorderWidth = 1, //should be given by user
                sliderCrispAdjuster = (sliderBorderWidth % 2) / 2,
                //variables required during drag
                sliderDragging,
                sliderDragStart,
                sliderDragEnd,
                sliderDragged,
                tooltext,
                conf1 = {
                isFirst: true
            },
            conf2 = {},
                scaleStart, scaleEnd,
                colorBox,
                scaleIsUpdating;

            //if valid colorRange
            if (colorRange && (colorArr = colorRange.colorArr) && (ln = colorArr.length) > 1) {

                conf1.toolText = scaleStart = min = colorRange.scaleMin;
                conf2.toolText = scaleEnd = max = colorRange.scaleMax;
                range = max - min;
                //slider conf
                conf1.snapPX = conf2.snapPX = 0;
                //slider conf for tooltip
                conf1.tooltipConstraint = conf2.tooltipConstraint = 'chart';
                conf1.getLabelConfig = conf2.getLabelConfig = getLabelConfig;
                conf1.tooltipPos = [0, 0];
                conf2.tooltipPos = [0, 0];

                conf2.tooltipOffsetReference = conf1.tooltipOffsetReference = {};
                conf2.tooltipOffsetReference.left =
                    conf1.tooltipOffsetReference.left += plotLeft - 20;
                conf2.tooltipOffsetReference.top =
                    conf1.tooltipOffsetReference.top += plotTop;

                colorBox = elements.colorBox = paper.group('colorBox', elementGroup);

                if (!isVertical) {//legend on bottom

                    conf1.tooltipPos[1] = conf2.tooltipPos[1] = plotHeight + plotTop;


                    x1 = mathRound(startX - sliderWidthHalf) + sliderCrispAdjuster;
                    x2 = mathRound(startX + sliderWidthHalf) + sliderCrispAdjuster;
                    y1 = mathRound(startY - legendSliderHeight) + sliderCrispAdjuster;
                    y2 = mathRound(startY + boxH) + sliderCrispAdjuster;
                    x3 = mathRound(startX - 2) + sliderCrispAdjuster;
                    x4 = mathRound(startX + 2) + sliderCrispAdjuster;
                    x5 = mathRound(startX) + sliderCrispAdjuster;
                    y3 = mathRound(startY) + sliderCrispAdjuster;
                    y4 = startY - sliderHeightHalf / 2;
                    y5 = mathRound(y4 - sliderHeightHalf) + sliderCrispAdjuster;
                    y4 = mathRound(y4) + sliderCrispAdjuster;
                    x6 = startX - sliderWidthHalf / 2;
                    x7 = mathRound(x6 + sliderWidthHalf) + sliderCrispAdjuster;
                    x6 = mathRound(x6) + sliderCrispAdjuster;


                    sliderX = x1;
                    sliderY = y1;
                    sliderW = legendSliderWidth;
                    sliderH = legendSliderHeight;

                    glassH = glassH / 2;

                    sliderPath = [M, x1, y1, L, x2, y1, x2, y3, x4, y3,
                        x5, y2, x3, y3, x1, y3, Z, M, x6, y5, L, x6, y4, M, x5, y5, L,
                        x5, y4, M, x7, y5, L, x7, y4];
                    sliderEffectPath = [M, x1, y1 + 1, L, x2, y1 + 1, M, x6 - 1, y5, L, x6 - 1, y4, M, x5 - 1, y5,
                        L, x5 - 1, y4, M, x7 - 1, y5, L, x7 - 1, y4];

                    //sliderPath = renderer.crispLine(sliderPath, legendSliderBorderWidth);
                    //s2TransX = boxW;
                    //s2TransY = 0;

                    scaleY = startY + boxH + legendScalePadding;
                    scaleY1 = mathRound(scaleY + legendScaleTickDistance) + scaleCrispAdjuster;
                    scaleY = mathRound(scaleY) + scaleCrispAdjuster;
                    scaleTextY = scaleY1;
                    labelTextY = startY + heightHalf;//text gutter
                    lastIndex = ln - 1;
                    for (i = 0; i < ln; i += 1) {
                        colorObj = colorArr[i];
                        itemValuePercent = (colorObj.maxvalue - min) / range;
                        itemX = (boxW * itemValuePercent) + startX;
                        scaleX = mathRound(itemX) + scaleCrispAdjuster;
                        if (i) {
                            FCcolor.ratio += COMMASTRING;
                            FCcolor.color += COMMASTRING;
                            FCcolor.alpha += COMMASTRING;
                            scalePath.push(L, scaleX, scaleY, scaleX, scaleY1, M, scaleX, scaleY);
                            if (i === lastIndex) {
                                labelPosition = POSITION_START;
                                itemX1 = itemX + textPadding;
                            }
                            else {
                                labelPosition = POSITION_MIDDLE;
                                itemX1 = itemX;
                            }
                        }
                        else {
                            scalePath.push(scaleX, scaleY, L, scaleX, scaleY1, M, scaleX, scaleY);
                            labelPosition = POSITION_END;
                            itemX1 = itemX - textPadding;
                        }

                        //create the color
                        FCcolor.ratio += ((itemValuePercent - lastPosition) * 100);
                        FCcolor.color += pluck(colorObj.code, COLOR_BLACK);
                        FCcolor.alpha += pluck(colorObj.alpha, 100);
                        lastPosition = itemValuePercent;

                        //Display Label
                        colorObj.legendItem = paper.text(elementGroup)
                            .attr({
                            text: colorObj.label,
                            x: itemX1,
                            y: labelTextY,
                            'text-anchor': labelPosition,
                            'vertical-align': POSITION_MIDDLE
                        })
                            .css(itemStyle);

                        //scale Label
                        colorObj.legendSymbol = paper.text(elementGroup)
                            .attr({
                            text: colorObj.scaleLabel,
                            x: itemX,
                            y: scaleTextY,
                            'text-anchor': POSITION_MIDDLE,
                            'vertical-align': POSITION_TOP
                        }).css(itemStyle);
                        //allItems.push(colorObj);
                    }
                    //slider conf
                    conf1.xMin = conf2.xMin = 0;
                    conf1.xMax = conf2.xMax = boxW;
                    conf1.yMin = conf2.yMin = 0;
                    conf1.yMax = conf2.yMax = 0;
                    conf1.y = conf2.y = 0;
                    conf1.x = 0;
                    conf2.x = boxW;
                    sTW = legendSliderWidth;
                    sTH = legendSliderHeight + boxH;

                }
                else {
                    conf1.tooltipPos[0] = conf2.tooltipPos[0] = plotWidth + plotLeft;

                    rotation = 270;
                    FCcolor.angle = 90;
                    x1 = startX - legendSliderWidth;
                    x2 = startX + boxW;
                    y1 = startY - sliderHeightHalf;
                    y2 = startY + sliderHeightHalf;



                    x1 = mathRound(startX - legendSliderWidth) + sliderCrispAdjuster;
                    x2 = mathRound(startX) + sliderCrispAdjuster;
                    y1 = mathRound(startY - sliderHeightHalf) + sliderCrispAdjuster;
                    y2 = mathRound(startY + sliderHeightHalf) + sliderCrispAdjuster;
                    x3 = mathRound(startX + boxW) + sliderCrispAdjuster;
                    y3 = mathRound(startY - 2) + sliderCrispAdjuster;
                    y4 = mathRound(startY + 2) + sliderCrispAdjuster;
                    y5 = mathRound(startY) + sliderCrispAdjuster;
                    x4 = startX - sliderWidthHalf / 2;
                    x5 = mathRound(x4 - sliderHeightHalf) + sliderCrispAdjuster;
                    x4 = mathRound(x4) + sliderCrispAdjuster;
                    y6 = startY - sliderHeightHalf / 2;
                    y7 = mathRound(y6 + sliderHeightHalf) + sliderCrispAdjuster;
                    y6 = mathRound(y6) + sliderCrispAdjuster;



                    glassW = glassW / 2;

                    sliderPath = [M, x1, y1, L, x2, y1, x2, y3, x3, y5,
                        x2, y4, x2, y2, x1, y2, Z, M, x5, y6, L, x4, y6, M, x5, y5, L,
                        x4, y5, M, x5, y7, L, x4, y7];
                    sliderEffectPath = [M, x1 + 1, y1, L, x1 + 1, y2, M, x5, y6 - 1, L,
                        x4, y6 - 1, M, x5, y5 - 1, L, x4, y5 - 1, M, x5, y7 - 1, L, x4, y7 - 1];

                    scaleX = startX + boxW + legendScalePadding;
                    scaleX1 = mathRound(scaleX + legendScaleTickDistance) + scaleCrispAdjuster;
                    scaleX = mathRound(scaleX) + scaleCrispAdjuster;
                    scaleTextX = scaleX1;
                    labelTextX = startX + widthHalf;//text gutter
                    lastIndex = ln - 1;
                    for (i = 0; i < ln; i += 1) {
                        colorObj = colorArr[i];
                        itemValuePercent = (colorObj.maxvalue - min) / range;
                        itemY = (boxH * itemValuePercent) + startY;
                        scaleY = mathRound(itemY) + scaleCrispAdjuster;
                        if (i) {
                            FCcolor.ratio += COMMASTRING;
                            FCcolor.color += COMMASTRING;
                            FCcolor.alpha += COMMASTRING;
                            scalePath.push(L, scaleX, scaleY, scaleX1, scaleY, M, scaleX, scaleY);
                            if (i === lastIndex) {
                                labelPosition = POSITION_END;
                                itemY1 = itemY + textPadding;
                            }
                            else {
                                labelPosition = POSITION_MIDDLE;
                                itemY1 = itemY;
                            }
                        }
                        else {
                            scalePath.push(scaleX, scaleY, L, scaleX1, scaleY, M, scaleX, scaleY);
                            labelPosition = POSITION_START;
                            itemY1 = itemY - textPadding;
                        }

                        //create the color
                        FCcolor.ratio += ((itemValuePercent - lastPosition) * 100);
                        FCcolor.color += pluck(colorObj.code, COLOR_BLACK);
                        FCcolor.alpha += pluck(colorObj.alpha, 100);
                        lastPosition = itemValuePercent;

                        //Display Label
                        colorObj.legendItem = paper.text(elementGroup)
                            .attr({
                            text: colorObj.label,
                            x: labelTextX,
                            y: itemY1,
                            'text-anchor': labelPosition,
                            'vertical-align': POSITION_MIDDLE
                        })
                            .rotate(rotation, labelTextX, itemY1)
                            .css(itemStyle);

                        //scale Label
                        colorObj.legendSymbol = paper.text(elementGroup)
                            .attr({
                            text: colorObj.scaleLabel,
                            x: scaleTextX,
                            y: itemY,
                            'text-anchor': POSITION_START,
                            'vertical-align': POSITION_MIDDLE
                        }).css(itemStyle);
                    }
                    //slider conf
                    conf1.xMin = conf2.xMin = 0;
                    conf1.xMax = conf2.xMax = 0;
                    conf1.yMin = conf2.yMin = 0;
                    conf1.yMax = conf2.yMax = boxH;
                    conf1.x = conf2.x = 0;
                    conf1.y = 0;
                    conf2.y = boxH;

                    sTW = legendSliderHeight + boxW;
                    sTH = legendSliderWidth;
                }


                //create the colorBOx
                elements.colorBox = paper.rect(colorBox)
                    .attr({
                    x: startX,
                    y: startY,
                    width: boxW,
                    height: boxH,
                    fill: toRaphaelColor(boxFill),
                    stroke: colorBoxBorderCOlor,
                    strokeWidth: colorBoxBorderWidth
                });

                //Create the glass effect
                if (lighting3d) {
                    elements.colorBoxEffect = paper.rect(colorBox)
                        .attr({
                        x: startX,
                        y: startY,
                        width: glassW,
                        height: glassH,
                        fill: COLOR_GLASS,
                        'stroke-width': 0
                    });
                }

                //create the Scale
                elements.scale = paper.path(elementGroup)
                    .attr({
                    path: scalePath,
                    stroke: legendScaleColor,
                    'stroke-width': legendScaleLineThickness
                });

                //various handler
                sliderDragged = function(xChange, yChange, dx, dy, isSlider1) {
                    var newScaleLimit,
                        tooltext;
                    if (!isVertical) {
                        newScaleLimit = (xChange * range / boxW) + min;
                        dx = xChange > 0 ? dx : (dx + xChange + 0.01);
                    }
                    else {
                        newScaleLimit = (yChange * range / boxH) + min;
                        dy = yChange > 0 ? dy : (dy + yChange + 0.01);
                    }
                    tooltext = calcPercent(newScaleLimit);


                    if (isSlider1) {
                        elements.slider1.translate(dx, dy);
                        elements.slider1Effect.translate(dx, dy);
                        elements.slider1Tracker.toFront()
                            .translate(dx, dy).tooltip(tooltext, null, null, true);
                        scaleStart = newScaleLimit;
                    } else {
                        elements.slider2.translate(dx, dy);
                        elements.slider2Effect.translate(dx, dy);
                        elements.slider2Tracker.toFront()
                            .translate(dx, dy).tooltip(tooltext, null, null, true);
                        scaleEnd = newScaleLimit;
                    }

                    if (interActivity) {
                        //update series
                        scaleIsUpdating = clearTimeout(scaleIsUpdating);
                        scaleIsUpdating = setTimeout(function() {
                            if (chart.setScaleRange) {
                                chart.setScaleRange(scaleStart, scaleEnd);
                            }
                        }, 100);
                    }
                };

                sliderDragging = function(dx, dy) {
                    var config = this,
                        xChange = 0,
                        yChange = xChange,
                        doDrag,
                        isFirst = config.isFirst,
                        otherConf = isFirst? conf2 : conf1;

                    if (!isVertical) {
                        xChange = config._startX + dx;
                        if (xChange <= 0) {
                            xChange = 0;
                        }
                        if (xChange > boxW) {
                            xChange = boxW;
                        }
                        if (isFirst ? xChange > otherConf.x : xChange < otherConf.x) {
                            xChange = otherConf.x;
                        }
                        if (mathAbs(xChange - config.x) >= (config.snapPX || 0)) {
                            doDrag = true;
                        }
                    }
                    else {
                        yChange = config._startY + dy;
                        if (yChange <= 0) {
                            yChange = 0;
                        }
                        if (yChange > boxH) {
                            yChange = boxH;
                        }
                        if (isFirst ? yChange > otherConf.y : yChange < otherConf.y) {
                            yChange = otherConf.y;
                        }
                        if (mathAbs(yChange - config.y) >= (config.snapPX || 0)) {
                            doDrag = true;
                        }
                    }
                    if (doDrag) {
                        sliderDragged(xChange, yChange, xChange - config.x, yChange - config.y, isFirst);
                        config.x = xChange;
                        config.y = yChange;
                    }
                };

                sliderDragStart = function() {
                    var config = this,
                        isFirst = config.isFirst;

                    config._startX = config.x;
                    config._startY = config.y;
                    config._scaleStart = scaleStart;
                    config._scaleEnd = scaleEnd;
                    /**
                     * This event is fired when the legend denotes a gradient legend. For heatmap chart and maps.
                     * This is event is fired when the legend pointer drag is started.
                     *
                     * @event FusionCharts#legendPointerDragStart
                     * @group legend
                     *
                     * @param {number} pointerIndex Indicates whether the index is 0 or 1.
                     * @param {object} pointers It is an object containing the scale start value and scale end value.
                     * @param {number} legendPointerHeight It is the legend pointer height in pixels or percent.
                     * @param {number} legendPointerWidth It is the legend pointer width in pixels or percent.
                     */
                    global.raiseEvent(LEGENDPOINTERDRAGSTART, {
                        pointerIndex: isFirst ? 0 : 1,
                        pointers: [{value: scaleStart},{value: scaleEnd}],
                        legendPointerHeight: legendSliderHeight,
                        legendPointerWidth: legendSliderWidth
                    }, chart.logic.chartInstance);
                };

                sliderDragEnd = function() {
                    var config = this,
                        isFirst = config.isFirst,
                        prevStart = config._scaleStart,
                        prevEnd = config._scaleEnd;
                    /**
                     * This event is fired when the legend Pointer Drag is stopped.
                     *
                     * @event FusionCharts#legendPointerDragStop
                     * @group legend
                     *
                     * @param {number} pointerIndex Indicates whether the index is 0 or 1.
                     * @param {object} pointers Its an object containing the scale start value and the scale end value.
                     * @param {number} legendPointerHeight It is the legend pointer height in pixels or percentage.
                     * @param {number} legendPointerWidth It is the legend pointer width in pixels or percentage.
                     */
                    global.raiseEvent(LEGENDPOINTERDRAGSTOP, {
                        pointerIndex: isFirst ? 0 : 1,
                        pointers: [{value: scaleStart},{value: scaleEnd}],
                        legendPointerHeight: legendSliderHeight,
                        legendPointerWidth: legendSliderWidth
                    }, chart.logic.chartInstance);

                    // If there has any change in scale then only rais LegendRangedUpdated event
                    if (prevStart !== scaleStart || prevEnd !== scaleEnd) {
                        /**
                         * This is event is fired if there is any change in scale.
                         *
                         * @event FusionCharts#legendRangeUpdated
                         * @group legend
                         *
                         * @param {number} previousMinValue Indicates the previous minimum value.
                         * @param {number} previousMaxValue Indicates the previous maximum value.
                         * @param {number} minValue Indicates the scale start value.
                         * @param {number} maxValue Indicates the scale end value.
                         */
                        global.raiseEvent(LEGENDRANGEUPDATED, {
                            previousMinValue: prevStart,
                            previousMaxValue: prevEnd,
                            minValue: scaleStart,
                            maxValue: scaleEnd
                        }, chart.logic.chartInstance);
                    }
                    delete config._scaleStart;
                    delete config._scaleEnd;
                };

                tooltext = calcPercent(min);
                //create the sliders
                elements.slider1 = paper.path(elementGroup)
                    .attr({
                    path: sliderPath,
                    fill: sliderFill,
                    strokeWidth: sliderBorderWidth,
                    stroke: sliderBorderColor
                });
                elements.slider1Effect = paper.path(elementGroup)
                    .attr({
                    path: sliderEffectPath,
                    fill: NONE,
                    strokeWidth: sliderBorderWidth,
                    stroke: sliderEffectColor
                });

                // Increase tracker width and height for touch devices
                if (hasTouch) {
                    x1 -= (mathMax(30, sTW) - sTW) * 0.5;
                    y1 -= (mathMax(40, sTH) - sTH) * 0.5;
                    sTW = mathMax(30, sTW);
                    sTH = mathMax(40, sTH);
                }

                elements.slider1Tracker = paper.rect(elementGroup).attr({
                    ishot: true,
                    width: sTW,
                    height: sTH,
                    x: x1,
                    y: y1,
                    fill: TRACKER_FILL,
                    stroke: NONE
                })
                .drag(sliderDragging, sliderDragStart, sliderDragEnd, conf1, conf1, conf1)
                .tooltip(tooltext, null, null, true)
                .css(symbolStyle);

                tooltext = calcPercent(max);
                elements.slider2 = paper.path(elementGroup).attr({
                    path: sliderPath,
                    fill: sliderFill,
                    strokeWidth: sliderBorderWidth,
                    stroke: sliderBorderColor
                })
                .translate(conf2.x, conf2.y);

                elements.slider2Effect = paper.path(elementGroup).attr({
                    path: sliderEffectPath,
                    fill: NONE,
                    strokeWidth: sliderBorderWidth,
                    stroke: sliderEffectColor
                }).translate(conf2.x, conf2.y);

                elements.slider2Tracker = paper.rect(elementGroup).attr({
                    ishot: true,
                    width: sTW,
                    height: sTH,
                    x: x1,
                    y: y1,
                    fill: TRACKER_FILL,
                    stroke: NONE
                }).translate(conf2.x, conf2.y)
                .css(symbolStyle)
                .drag(sliderDragging, sliderDragStart, sliderDragEnd, conf2, conf2, conf2)
                .tooltip(tooltext, null, null, true);

            }
        };
    }]);
/**!
 * @license FusionCharts JavaScript Library
 * Copyright FusionCharts Technologies LLP
 * License Information at <http://www.fusioncharts.com/license>
 *
 * @version 3.4.0
 */
/**
 * @private
 * @module fusioncharts.renderer.javascript.maps
 * @requires fusioncharts.renderer.javascript.legend-gradient
 * @export fusioncharts.maps.js
 */
FusionCharts.register('module', ['private', 'modules.renderer.js-maps', function () {

    var global = this,
        win = global.window,
        lib = global.hcLib,
        renderer = lib.chartAPI,
        chartAPI = renderer,
        doc = win.document,
        pluck = lib.pluck,
        imprint = lib.imprint,
        extend2 = lib.extend2,
        parseTooltext = lib.parseTooltext,
        pluckNumber = lib.pluckNumber,
        pluckFontSize = lib.pluckFontSize,
        getHCJSON = lib.HCstub,
        defaultPaletteOptions = extend2(lib.defaultPaletteOptions, {
            foregroundcolor: '333333',
            foregroundalpha: '100',
            foregrounddarkcolor: '111111',
            foregrounddarkalpha: '100',
            foregroundlightcolor: '666666',
            foregroundlightalpha: '100',
            backgroundlightcolor: 'FFFFFF',
            backgroundlightalpha: '100',
            backgroundlightangle: 90,
            backgroundlightratio: '',
            backgroundcolor: 'FFFFCC',
            backgroundalpha: '100',
            backgrounddarkcolor: 'ffcc66',
            backgrounddarkalpha: '100',
            backgrounddarkangle: 270,
            backgrounddarkratio: '',
            shadow: 1
        }),
        setLineHeight = lib.setLineHeight,

        getValidValue = lib.getValidValue,
        parseUnsafeString = lib.parseUnsafeString,
        getFirstColor = lib.getFirstColor,
        convertColor = lib.graphics.convertColor,
        hashify = lib.hashify,
        getDashStyle = lib.getDashStyle,

        userAgent = win.navigator.userAgent,
        isIE = /msie/i.test(userAgent) && !win.opera,
        /** @todo fix this. */
        isWebKit = /AppleWebKit/.test(userAgent),
        isStrokeReg = /stroke/ig,
        hasSVG = lib.hasSVG,

        CONFIGKEY = lib.FC_CONFIG_STRING,
        ZERO = '0',
        PX = 'px',
        COMMASPACE = ', ',
        COMMA = ',',
        QUOTE = '"',
        QUOTECOMMAQUOTE = '","',
        CRLFQUOTE = '\r\n"',
        BLANK = '',
        POSITION_TOP = 'top',
        POSITION_BOTTOM = 'bottom',
        POSITION_RIGHT = 'right',
        POSITION_LEFT = 'left',
        POSITION_MIDDLE = 'middle',
        POSITION_CENTER = 'center',
        POSITION_START = 'start',
        POSITION_END = 'end',
        SHAPE_CIRCLE = 'circle',
        NONE = 'none',
        TILE = 'tile',
        FILL = 'fill',
        FIT = 'fit',
        BOLD = 'bold',
        NORMAL = 'normal',
        CRISP = 'crisp',
        GEO = 'geo',
        INNERRADIUSFACTOR = 0.6,

        math = win.Math,
        mathMin = math.min,
        mathMax = math.max,
        mathCeil = math.ceil,

        // Entity options
        DATA_ENABLED = 'isDataEnabled',
        HAS_HOVER = 'isDataEnabled',
        HAS_NEW_DS = '_ds',
        MARKER_ITEM_KEY = 'items',

        CREDITS = false && (!/fusioncharts\.com$/i.test(win.location.hostname)),

        toRaphaelColor = lib.toRaphaelColor,

        mapRenderer,

        TEXT_ANCHOR_MAP = {
            left : 'start',
            right: 'end',
            center: 'middle'
        },

        extend = function (a, b) { /** @todo refactor dependency */
            var n;
            if (!a) {
                a = {};
            }
            for (n in b) {
                a[n] = b[n];
            }
            return a;
        },

        /*
         * Function to check if the element is whose scpoe the function is being
         * called is a descendant of the passed element or not.
         * ~returns {undefined}
         */
        isDescendant = function (parent) {
            var ele = this,
            currParent = ele.parentNode;

            if (!currParent) {
                return false;
            }

            while (currParent) {
                if (currParent === doc.documentElement) {
                    return false;
                }
                else if (currParent === parent) {
                    return true;
                }
                else {
                    currParent = currParent.parentNode;
                }
            }

            return false;
        },

        /**
         * Reduces the pain of writing loads of object structures while creating
         * FusionCharts specific color configurations
         */
        colorize = function (original, obj) {
            var col = !obj ? {
                FCcolor: original
            } : extend(original.FCcolor, obj);

            col.toString = toRaphaelColor;
            return col;
        },

        ColorPalette = function (hash, index) {
            var subpalette,
                key;

            this.index = index;

            for (key in hash) {
                subpalette = defaultPaletteOptions[hash[key]];
                this[key] = subpalette instanceof Array ? subpalette[index] : subpalette;
            }
        },

        getTextWrapWidth = {
            right: function (w, x) {
                return x;
            },
            left: function (w, x) {
                return w - x;
            },
            center: function (w, x) {
                return mathMin(x, w - x) * 2;
            }
        },

        getTextWrapHeight = {
            top: function (h, y) {
                return y;
            },
            middle: function (h, y) {
                return mathMin(y, h - y) * 2;
            },
            bottom: function (h, y) {
                return h - y;
            }
        },

        getMarkerRadiusLimits = function (width, height, userMax, userMin) {

            var dime = mathMin(width, height),
                factor = 0.02,
                times = 3.5,
                minR = (factor * dime),
                maxR = (factor * times * dime);

            userMin = parseFloat(userMin);
            userMax = parseFloat(userMax);

            if (!isNaN(userMin) && !isNaN(userMax)) {
                if (userMin < userMax) {
                    return {
                        min: userMin,
                        max: userMax
                    };
                }
                else {
                    return {
                        min: userMax,
                        max: userMin
                    };
                }
            }
            else if (!isNaN(userMin)) {
                return {
                    min: userMin,
                    max: 10 * userMin
                };
            }
            else if (!isNaN(userMax)) {
                return {
                    min: parseInt((userMax / 10), 10),
                    max: userMax
                };
            }
            else {
                return {
                    min: minR,
                    max: maxR
                };
            }
        },

        convertArrayToIdMap = function (arr) {
            var i = (arr && arr.length) || 0,
                ret = {},
                item;

            while (i--) {
                item = arr[i];
                if (item.id !== undefined) {
                    ret[item.id.toLowerCase()] = item;
                }
            }

            return ret;
        },

        pruneStrokeAttrs = function (obj, thicknessModifier) {
            var key,
                returnObj = {};

            thicknessModifier = thicknessModifier || 1;

            if (!obj || typeof obj !== 'object') {
                return returnObj;
            }

            for (key in obj) {
                if (!isStrokeReg.test(key)) {
                    if (key === 'stroke-width') {
                        returnObj[key] = Number(obj[key]) / thicknessModifier;

                        if (isWebKit) {
                            // webkit issue fix
                            returnObj[key] = (returnObj[key] && mathCeil(returnObj[key])) || 0;
                        }
                    }
                    else {
                        returnObj[key] = obj[key];
                    }
                }
            }

            return returnObj;
        },

        resetLastHover = function () {

            var rapi = this;

            if (rapi.hoverEntity) {
                /**
                 * A map might contain entities marked by concrete boundaries. For example, the India map has 28 states,
                 * each state can be marked as an entity . Every entity has an id by which it is referred to in the
                 * JS file. The user can assign an in autonomous id's to the entity or use the original Id.
                 *
                 * The `entityRollOut` event is fired when the pointer is rolled outside of an entity.
                 *
                 * @event FusionCharts#entityRollOut
                 * @group map:entity
                 * @see  FusionCharts#event:entityClick
                 * @see  FusionCharts#event:entityRollOver
                 *
                 * @param {number} value The value of the entity.
                 * @param {string} label The label of the entity.
                 * @param {string} shortLabel Short label used by the user.
                 * @param {string} originalId The ID of the entity stored in the map definition file.
                 * @param {string} id This could be the original ID or the ID assigned by the user.
                 */
                lib.raiseEvent.apply(lib, rapi.hoverEntityEventArgs);

                delete rapi.hoverEntityEventArgs;
                if (rapi.hoverEntity && rapi.hoverEntityAttr) {
                    rapi.hoverEntity.attr(rapi.hoverEntityAttr);
                }
                delete rapi.hoverEntityAttr;
                rapi.hoverEntity = null;
            }
        },

        /**
         * Converts an array of objects to a hash based on a key present in the objects
         * of the array.
         *
         * @param {array} arr Array containing the objects.
         * @param {string} idKey The key in the array objects whose value is used to
         * create the keys in the returnObj. The values of this key should be
         * unique across all objects in the array.
         *
         * @returns {object} returnObj Object with the idKey as the key and
         * objects as the values.
         */
        convertToObj = function (arr, idKey) {
            var i = (arr && arr.length) || false,
                key = idKey || 'id',
                returnObj = {},
                item;

            if (!arr) {
                return arr;
            }

            while (i--) {
                item = arr[i];

                (item[key] !== undefined) && (returnObj[item[key].toLowerCase()] = item);
            }

            return returnObj;
        },


        /**
         * The parent class that acts as the container for the Entities.
         * This class creates the individual EntityItem for every entity.
         *
         * @param {type} data The
         * @param {type} rapi
         * @param {type} mapApi
         * @param {type} group
         * @returns {unresolved}
         */
        Entities = function (data, rapi, mapApi, group) {

            // Cannot create the entities without entityPathMap
            if (!(mapApi && mapApi.getEntityPaths())) {
                return;
            }

            var firstEntId = mapApi.getFirstId(),
                entityCount = mapApi.entityCount,
                epmCopy = mapApi.getEntityPaths(true),
                api = rapi,
                annotations = rapi.mapAnnotations,
                options = api.options,
                // The rendering should be done in batches only for IE.
                // Setting BATCH_SIZE to 0 will render all the entities.
                BATCH_SIZE = isIE ? 50 : 0,
                batchRenderer,
                batchRendererLegacy,
                canvasEle;

            this.entityPathMap = epmCopy;
            this.data = data;
            this.chartObj = api;
            this.items = {};
            this.ready = false;
            this.group = group || rapi.mapGroup;

            function init() {
                var ent = this,
                    entityPathMap = ent.entityPathMap,
                    data = ent.data,
                    itemMap = ent.items,
                    item;

                // First create the EntityItem objects for the entities for which the
                // user has provided values and other attributes.
                data = convertArrayToIdMap(data);

                // Then create the EntityItem objects for the remaining entities.
                batchRenderer = function () {
                    var dataItem,
                        entItem = entityPathMap[item];

                    while (entItem) {
                        if (!itemMap[item]) {
                            dataItem = data[item];
                            if (dataItem) {
                                dataItem.mapItem = itemMap[item] =
                                    new EntityItem(
                                            item,
                                            imprint(sanitizeEntityOptions(dataItem), entItem),
                                            api,
                                            ent.group
                                        );
                            }
                            else {
                                itemMap[item] = new EntityItem(item, entItem, api, ent.group);
                            }
                            item = entItem.nextId && entItem.nextId.toLowerCase();
                            entItem = ((item !== undefined) && entityPathMap[item]) || null;
                        }
                        else {
                            // break out
                            ent = null;
                        }
                    }

                    initComplete.call(ent);
                };
                batchRendererLegacy = function () {
                    // To counter the performance issues while rendering in IE, the entities shall
                    // be rendered in batches of BATCH_SIZE.
                    var obj,
                        dataItem,
                        batchSize = BATCH_SIZE,
                        item,
                        count = 0;

                    for (item in epmCopy) {
                        if (!itemMap[item]) {
                            obj = entityPathMap[item];
                            dataItem = data[item];
                            if (dataItem) {
                                dataItem.mapItem = itemMap[item] = new EntityItem(item,
                                    imprint(sanitizeEntityOptions(dataItem), obj), api, ent.group);
                            }
                            else {
                                itemMap[item] = new EntityItem(item, obj, api, ent.group);
                            }
                            count += 1;
                            delete epmCopy[item];

                            if (count === batchSize) {
                                break;
                            }
                        }
                    }

                    if (count < entityCount) {
                        entityCount = entityCount - count;
                        setTimeout(batchRendererLegacy, 0);
                    }
                    else {
                        initComplete.call(ent);
                    }
                };

                item = firstEntId && firstEntId.toLowerCase();
                if (item) {
                    batchRenderer();
                }
                else {
                    batchRendererLegacy();
                }
            }

            function sanitizeEntityOptions(options) {
                // The entity object cannot have the following properties.
                delete options.outlines;
                delete options.label;
                delete options.shortlabel;
                delete options.labelposition;
                delete options.labelalignment;
                delete options.labelconnectors;

                return options;
            }

            function drawLabels () {
                var ent = this,
                    itemMap = ent.items,
                    labelItems = [],
                    labelObj,
                    i,
                    groupObj = {
                        id: 'entityLabels',
                        items: labelItems
                    };

                for (i in itemMap) {
                    labelObj = itemMap[i].drawLabel(labelItems);
                }

                annotations.addGroup(groupObj);
            }

            function destroy() {
                var ent = this,
                    itemMap = ent.items,
                    i;

                for (i in itemMap) {
                    itemMap[i].destroy();
                }

                delete ent.entityPathMap;
                delete ent.data;
                delete ent.chartObj;
                delete ent.items;
                delete ent.group;
            }

            function initComplete () {
                if (options.entities.labelsOnTop) {
                    drawLabels.call(this);
                }
                this.ready = true;
                api.checkComplete();
            }

            this.isReady = function () {
                return this.ready;
            };

            init.call(this);


            /** @todo No need to draw trackers in RedRaphael. */
            //drawTrackers.call(this);

            //this.drawTrackers = drawTrackers;
            this.drawLabels = drawLabels;
            this.destroy = destroy;
            this.init = init;
            this.initComplete = initComplete;

            if (!api.__canvasMouseOutListenerAdded) {
                api.__canvasMouseOutListenerAdded = true;
                canvasEle = rapi.paper.canvas;
                lib.addEvent(canvasEle, 'mouseout', function (e) {
                    var mouseoverEle = e.originalEvent.relatedTarget ||
                        e.originalEvent.toElement;

                    if (!isIE || hasSVG) {
                        if (!(mouseoverEle && mouseoverEle.ownerSVGElement &&
                            (mouseoverEle.ownerSVGElement === canvasEle))) {

                            resetLastHover.call(api);
                        }
                    }
                    else if (mouseoverEle === doc.documentElement ||
                        mouseoverEle === rapi.container ||
                        mouseoverEle === rapi.container.parentElement) {

                        resetLastHover.call(api);
                    }
                    else if (!isDescendant.call(mouseoverEle, canvasEle)) {
                        resetLastHover.call(api);
                    }
                });
            }
        },

        EntityItem = function (id, entityJSON, rapi, group) {

            if (!entityJSON || !rapi || id === undefined) {
                return;
            }

            this.chart = rapi;
            this.eJSON = entityJSON;
            this.group = group;
            this.id = id;
            // originalId has the case of the id provided preserved for future use.
            this.originalId = entityJSON.origId;
            this.isVisible = true;
            this.svgElems = {};
            this.connectorElem = {};
            this.featureConfig = entityJSON.options;

            if (typeof this.featureConfig === 'object') {
                this.featureConfig[HAS_NEW_DS] = true;
            }


            function hasFeature(key) {
                var ent = this,
                    config = ent.featureConfig;

                if (config && typeof config[key] !== 'undefined') {
                    return Boolean(config[key]);
                }

                return false;
            }

            function getDefaultTooltip () {
                var ent = this,
                    tooltip,
                    labelObj;

                if (hasFeature.apply(ent, [HAS_NEW_DS])) {
                    labelObj = entityJSON.labels && entityJSON.labels[0];
                    if (!labelObj) {
                        return undefined;
                    }
                    tooltip = ((chartEntOpts.useSNameInTooltip ?
                        labelObj.shortText : labelObj.text) +
                        (isNaN(value) ? BLANK : (chartEntOpts.tooltipSepChar +
                        formattedValue)));
                }
                else {
                    tooltip = ((chartEntOpts.useSNameInTooltip ?
                        entityJSON.shortLabel : entityJSON.label) +
                        (isNaN(value) ? BLANK : (chartEntOpts.tooltipSepChar +
                        formattedValue)));
                }

                return tooltip;
            }

            function getDisplayValue (labelObj, includeValue, includeUserData) {
                var displayValue;

                if (includeValue) {
                    if (includeUserData && typeof entityJSON.displayvalue !== 'undefined') {
                        displayValue = entityJSON.displayvalue;
                    } else {
                        displayValue = pluck((chartEntOpts.includeNameInLabels ?
                            (chartEntOpts.useShortName ?
                                labelObj.shortText : labelObj.text) : ''));

                        if (chartEntOpts.includeValueInLabels && !isNaN(value)) {
                            displayValue = (displayValue === undefined) ? formattedValue :
                                (displayValue + labelSepChar + formattedValue);
                        }
                    }
                }
                else {
                    displayValue = labelObj.text;
                }

                return displayValue;
            }

            function drawLabelConnectors (connectorArr) {

                var entity = this,
                    i = (connectorArr && connectorArr.length) || 0,
                    path;

                while (i--) {
                    path = connectorArr[i];
                    entity.connectorElem[i] = paper.path(path, entity.group)
                        .attr({
                            transform: visibleEntityAttr.transform,
                            stroke: convertColor(connectorColor, connectorAlpha),
                            'shape-rendering': CRISP,
                            'stroke-width': connectorThickness//(scaledPixel) /// (scaleFactor * baseScaleFactor))
                        });
                }
            }

            function draw () {

                var entity = this,
                    chart = entity.chart,
                    paper = chart.paper,
                    pathStr = (hasSVG || !isIE) ? 'litepath' : 'path',
                    outlines = entity.eJSON.outlines,
                    addTo = entity.group,
                    i,
                    path,
                    styleAttr;

                i = (outlines && outlines.length) || 0;

                if (entity.hasFeature(HAS_NEW_DS)) {
                    if (entity.hasFeature(DATA_ENABLED)) {
                        if (showShadow) {
                            while (i--) {
                                path = outlines[i].outline;
                                entity.svgElems[i] = {};
                                entity.svgElems[i].graphic = paper[pathStr](path, addTo)
                                    .attr(visibleEntityAttr)
                                    .tooltip(toolText)
                                    .shadow(shadowOptions, rapi.shadowLayer);
                            }
                        }
                        else {
                            while (i--) {
                                path = outlines[i].outline;
                                entity.svgElems[i] = {};
                                entity.svgElems[i].graphic = paper[pathStr](path, addTo)
                                    .tooltip(toolText)
                                    .attr(visibleEntityAttr);
                            }
                        }
                    }
                    else {
                        if (showShadow) {
                            while (i--) {
                                styleAttr = extend2(extend2({}, visibleEntityAttr),
                                    pruneStrokeAttrs(outlines[i].style, customStrokeWidthModifier));
                                path = outlines[i].outline;
                                entity.svgElems[i] = {};
                                entity.svgElems[i].graphic = paper[pathStr](path, addTo)
                                    .attr(styleAttr)
                                    .tooltip(toolText)
                                    .shadow(shadowOptions, rapi.shadowLayer);
                            }
                        }
                        else {
                            while (i--) {
                                styleAttr = extend2(extend2({}, visibleEntityAttr),
                                    pruneStrokeAttrs(outlines[i].style, customStrokeWidthModifier));
                                path = outlines[i].outline;
                                entity.svgElems[i] = {};
                                entity.svgElems[i].graphic = paper[pathStr](path, addTo)
                                    .tooltip(toolText)
                                    .attr(styleAttr);
                            }
                        }
                    }

                    if (entity.hasFeature(HAS_HOVER)) {
                        entity.addMouseGestures();
                    }
                }
                else {
                    if (showShadow) {
                        while (i--) {
                            path = outlines[i];
                            entity.svgElems[i] = {};
                            entity.svgElems[i].graphic = paper[pathStr](path, addTo)
                                .attr(visibleEntityAttr)
                                .tooltip(toolText)
                                .shadow(shadowOptions, rapi.shadowLayer);

                        }
                    }
                    else {
                        while (i--) {
                            path = outlines[i];
                            entity.svgElems[i] = {};
                            entity.svgElems[i].graphic = paper[pathStr](path, addTo)
                                .tooltip(toolText)
                                .attr(visibleEntityAttr);

                        }
                    }
                    entity.addMouseGestures();
                }

                return entity;
            }

            function setHoverPoint(e) {
                var entity = this,
                chart = entity.chart;

                chart.hoverEntityEventArgs = ['entityrollout', entity.eventArgs, chart.fusionCharts,
                    [chart.fusionCharts.id, 'rollOut', entity.legacyEventArgs], e];

                if (useHoverColor && entity.isVisible) {
                    chart.hoverEntity = entity;
                    chart.hoverEntityAttr = entity.revertAttr;
                    entity.attr(entity.hoverAttr);
                }
                /**
                 * A map might contain entities marked by concrete boundaries. For example, the India map has 28 states,
                 * each state can be marked as an entity . Every entity has an id by which it is referred to in the
                 * map definition file. The user can assign an in autonomous id's to the entity or use the original Id.
                 *
                 * The `entityRollOver` event is fired when the pointer is rolled over an entity.
                 * This event is followed either by the {@link FusionCharts#event:entityClick} event or the
                 * {@link FusionCharts#event:entityRollOut} event.
                 *
                 * @event FusionCharts#entityRollOver
                 * @group map:entity
                 * @see  FusionCharts#event:entityClick
                 * @see  FusionCharts#event:entityRollOut
                 *
                 * @param {number} value The value of the entity.
                 * @param {string} label The label of the entity.
                 * @param {string} shortLabel Short label used by the user.
                 * @param {string} originalId The ID of the entity stored in the map definition file.
                 * @param {string} id This could be the original ID or the ID assigned by the user.
                 */
                lib.raiseEvent('entityrollover', entity.eventArgs, chart.fusionCharts, [chart.fusionCharts.id,
                    'rollOver', entity.legacyEventArgs], e);
            }

            function getLabelObject (labelObj, userValue, userDV) {
                var entity = this,
                    chart = entity.chart,
                    labelPos = labelObj.labelPosition,
                    labelAlignment = labelObj.labelAlignment,
                    firstEle = entity.svgElems[0] && entity.svgElems[0].graphic,
                    fontStyleObj = labelObj.style,
                    labelX,
                    labelY,
                    box,
                    align,
                    valign,
                    fcolor,
                    fsize,
                    ffamily,
                    fbold;

                if (labelPos) {
                    labelX = labelPos[0];
                    labelY = labelPos[1];
                }
                else {
                    box = firstEle.getBBox();
                    labelX = box.x + (box.width / 2);
                    labelY = box.y + (box.height / 2);
                }

                if (labelAlignment) {
                    // labelPadding neednt be scaleFactored.
                    align = labelAlignment[0];
                    valign = labelAlignment[1];

                    if (align === POSITION_RIGHT) {
                        labelX -= labelPadding;
                    }
                    else if (align === POSITION_LEFT) {
                        labelX += labelPadding;
                    }

                    if (valign === POSITION_TOP) {
                        labelY -= labelPadding;
                    }
                    else if (valign === POSITION_BOTTOM) {
                        labelY += labelPadding;
                    }

                }
                else {
                    align = POSITION_CENTER,
                    valign = POSITION_MIDDLE;
                }

                // font styles
                fcolor = fontColor,
                fsize = parseFloat(fontSize) / rapi.sFactor,
                ffamily = fontFamily,
                fbold = fontBold;

                if (!userValue && fontStyleObj) {
                    /** @todo change fill property to color as for fonts fill is non-standard */
                    fontStyleObj.color && (fcolor = fontStyleObj.color);
                    fontStyleObj['font-size'] && (fsize = (parseFloat(fontStyleObj['font-size']) / rapi.sFactor));
                    fontStyleObj['font-family'] && (ffamily = fontStyleObj['font-family']);
                    (fontStyleObj['font-weight'] !== undefined) && (fbold = (fontStyleObj['font-weight'] === 'bold'));
                }

                // draw the label.
                return {
                    x: labelX.toString(),
                    y: labelY.toString(),
                    wrapwidth: getTextWrapWidth[align](baseWidth, labelX + xOffset) - labelPadding,
                    wrapheight: getTextWrapHeight[valign](baseHeight, labelY + yOffset) - labelPadding,
                    wrap: 1,
                    type: 'text',
                    align: align,
                    valign: valign,
                    text: getDisplayValue(labelObj, userValue, userDV),
                    tooltext: toolText,
                    link: link,
                    bgcolor: BLANK,
                    bordercolor: BLANK,
                    fillcolor: fcolor,
                    fontsize: fsize,
                    font: ffamily,
                    bold: fbold,
                    onclick: function (e) {
                        /**
                         * A map contains *entities* marked by concrete boundaries. For example, the India map has 28
                         * states, each state can be marked as an entity. Every entity has an id by which it is referred
                         * to in the JS file . The user can assign an Id of choice to the entity or use the original ID
                         * of the entity. The `entityClick` event is fired when an *entity* is clicked.
                         *
                         * The user can used this event to perform an action on clicking the entity. This event is
                         * usually preceded by the the {@link FusionCharts#event:entityRollOver} event.
                         *
                         * @event FusionCharts#entityClick
                         * @group map:entity
                         * @see  FusionCharts#event:entityRollOver
                         * @see  FusionCharts#event:entityRollOut
                         *
                         * @param {number} value The value of the entity.
                         * @param {string} label The label of the entity.
                         * @param {string} shortLabel Short label used by the user.
                         * @param {string} originalId The ID of the entity stored in the JS file.
                         * @param {string} id This could be the original ID or the ID assigned by the user.
                         *
                         * @example
                         * FusionCharts.ready(function () {
                         *     var map = new FusionCharts({
                         *         type: 'maps/world',
                         *         renderAt: 'map-container-div',
                         *
                         *         events: {
                         *             entityClick: function (event, args) {
                         *                 console.log(args.label + 'clicked');
                         *             }
                         *         }
                         *     });
                         * });
                         *
                         */
                        global.raiseEvent('entityclick', entity.eventArgs, rapi.fusionCharts, e);
                    },

                    onmouseover: function (e) {
                        var hoverEnt = entity;
                        if (hoverEnt !== chart.hoverEntity) {
                            resetLastHover.call(hoverEnt.chart);
                            setHoverPoint.call(hoverEnt, e);
                        }
                    },

                    ontouchstart: function (e) {
                        var hoverEnt = entity;
                        if (hoverEnt !== chart.hoverEntity) {
                            resetLastHover.call(hoverEnt.chart);
                            setHoverPoint.call(hoverEnt, e);
                        }
                    }
                };
            }

            function drawLabel (annotationsArray) {

                var entity = this,
                    eJSON = entity.eJSON,
                    useValue = entity.hasFeature(DATA_ENABLED),
                    labelArr,
                    labelObj,
                    i;

                if (!showLabel) {
                    return null;
                }

                if (entity.hasFeature(HAS_NEW_DS)) {
                    labelArr = eJSON.labels;
                    i = (labelArr && labelArr.length) || 0;

                    while (i--) {
                        labelObj = labelArr[i];
                        annotationsArray.push(entity.getLabelObject(labelObj, useValue, !i));
                        if (labelObj.labelConnectors) {
                            entity.drawLabelConnectors(labelObj.labelConnectors);
                        }
                    }
                }
                else {
                    labelObj = {
                        text: eJSON.label,
                        shortText: eJSON.shortLabel,
                        labelAlignment: eJSON.labelAlignment,
                        labelPosition: eJSON.labelPosition
                    };
                    annotationsArray.push(entity.getLabelObject(labelObj, true, true));
                    if (eJSON.labelConnectors) {
                        entity.drawLabelConnectors(eJSON.labelConnectors);
                    }
                }

                return;
            }

            /**
             *  For now this will simply call the attr of the svg elements. If the
             *  need arises we can extend it to handle FusionMaps specific attrs as
             *  well.
             *
             */
            function attr (attribute, val) {
                var svgElems = this.svgElems,
                    item;

                for (item in svgElems) {
                    svgElems[item].graphic &&
                            svgElems[item].graphic.attr(attribute, val);
                }
            }

            function show () {
                var svgElems = this.svgElems,
                    item;

                this.isVisible = true;

                for (item in svgElems) {
                    svgElems[item].graphic &&
                            svgElems[item].graphic.attr(visibleEntityAttr);

                }
            }

            function hide () {
                var entity = this,
                    svgElems = entity.svgElems,
                    chart = entity.chart,
                    item;

                this.isVisible = false;

                // If this element was hovered over last then the hover state
                // needs to be cleared.
                if (chart.hoverEntity === entity) {
                    resetLastHover.call(chart);
                }

                for (item in svgElems) {
                    svgElems[item].graphic &&
                            svgElems[item].graphic.attr(hiddenEntityAttr);
                }
            }

            function entityClick (e) {
                var entity = this.node.__entity;

                global.raiseEvent('entityclick', entity.eventArgs,
                    rapi.fusionCharts, e);

                // parse user links
                (link !== undefined) && rapi.logic.linkClickFN.call({
                    link: link
                });
            }

            function entityOver (e) {
                var entity = this.node.__entity,
                    chart = entity.chart;

                if (entity !== chart.hoverEntity) {
                    resetLastHover.call(chart);
                    setHoverPoint.call(entity, e);
                }
            }

            /**
             *  Attach mouse over and mouse out events.
             **/
            function addMouseGestures () {
                var entity = this,
                    options = entity.eJSON,
                    svgElems = entity.svgElems,
                    item;

                entity.eventArgs = {
                    value: entity.value,
                    label: options.label,
                    shortLabel: options.shortLabel,
                    originalId: entity.originalId || entity.id,
                    id: entity.id
                };

                entity.legacyEventArgs = {
                    value: entity.value,
                    lName: options.label,
                    sName: options.shortLabel,
                    id: entity.originalId || entity.id
                };

                if (useHoverColor) {
                    entity.hoverAttr = {
                        fill: entity.hoverColor.toString()
                    };
                    entity.revertAttr = {
                        fill: entity.fillColor.toString()
                    };

                    if (hoverBorderThickness !== borderThickness) {
                        entity.hoverAttr['stroke-width'] = hoverBorderThickness;
                        entity.revertAttr['stroke-width'] = borderThickness;
                    }
                    /*
                     * @todo: Enable once the drawing of entities allows these
                     * hover effects to be applied properly.
                    if (hoverBorderColor !== borderColor || hoverBorderAlpha !== borderAlpha) {
                        entity.hoverAttr['stroke'] = convertColor(hoverBorderColor, hoverBorderAlpha);
                        entity.revertAttr['stroke'] = convertColor(borderColor, borderAlpha);
                    }*/
                }

                if (!isNaN(value) || hoverOnNull) {
                    for (item in svgElems) {
                        if (link !== undefined) {
                            svgElems[item].graphic
                            .css({
                                cursor : 'pointer',
                                '_cursor': 'hand'
                            });
                        }

                        svgElems[item].graphic.node.__entity = entity;

                        svgElems[item].graphic
                            .click(entityClick)
                            .hover(entityOver);
                    }
                }
            }

            /**
             *  Cleanup the entities when the chart is disposed.
             **/
            function destroy() {
                var ent = this,
                    elems = ent.svgElems,
                    conn = ent.connectorElem,
                    item;

                //ent.removeMouseGestures();

                for (item in elems) {
                    // They will have remove methods defined as they are raphael objects.
                    elems[item].remove && elems[item].remove();
                }

                for (item in conn) {
                    conn[item].destroy && conn[item].destroy();
                }

                delete ent.value;
                delete ent.formattedValue;
                delete ent.toolText;
                delete ent.fillColor;
                delete ent.hoverColor;
                delete ent.chart;
                delete ent.group;
                delete ent.id;
                delete ent.isVisible;
                delete ent.svgElems;
                delete ent.connectorElem;
                delete ent.renderer;
                delete ent.options;
            }

            /** @todo Fix all the default values being provided here to be consistent with the flash version. */
            var options = rapi.options,
                paper = rapi.paper,
                chartEntOpts = options.entities,
                styleObj = chartEntOpts.dataLabels.style,
                cleanValue = entityJSON.cleanValue,
                value = (cleanValue === null) ? undefined : cleanValue,
                formattedValue = this.formattedValue =
                    entityJSON.formattedValue || '',
                labelSepChar = chartEntOpts.labelSepChar,
                showTooltip = pluckNumber(entityJSON.showtooltip, chartEntOpts.showTooltip),
                defaultTooltip = getDefaultTooltip.call(this),
                tooltextMacroObj = {
                    formattedValue: formattedValue,
                    sName: entityJSON.shortLabel,
                    lName: entityJSON.label
                },
                toolText = showTooltip ?
                    parseUnsafeString(pluck(parseTooltext(
                        pluck(entityJSON.tooltext, chartEntOpts.tooltext, defaultTooltip),
                        [1, 2, 7, 38, 39],
                        tooltextMacroObj,
                        entityJSON)))
                    : BLANK,
                color,
                alpha,
                angle,
                ratio,
                fillColor,

                showLabel = pluckNumber(entityJSON.showlabel, chartEntOpts.showLabels),
                borderColor = pluck(entityJSON.bordercolor, chartEntOpts.borderColor),
                borderAlpha = pluck(entityJSON.borderalpha, chartEntOpts.borderAlpha),
                scaleBorder = chartEntOpts.scaleBorder === 1,
                borderThickness = pluckNumber(entityJSON.borderthickness, chartEntOpts.borderThickness),

                connectorColor = pluck(entityJSON.labelconnectorcolor, chartEntOpts.connectorColor),
                connectorAlpha = pluck(entityJSON.labelconnectoralpha, chartEntOpts.connectorAlpha),
                connectorThickness = pluckNumber(entityJSON.labelconnectorthickness, chartEntOpts.connectorThickness),

                fontFamily = pluck(entityJSON.font, styleObj.fontFamily),
                fontSize = pluckNumber(parseInt(entityJSON.fontsize, 10), parseInt(styleObj.fontSize, 10)),
                fontColor = pluck(entityJSON.fontcolor, styleObj.color),
                labelPadding = pluckNumber(entityJSON.labelpadding, chartEntOpts.labelPadding),
                hoverOnNull = chartEntOpts.hoverOnNull,
                useHoverColor = pluckNumber(entityJSON.showhovereffect, entityJSON.usehovercolor,
                    (hoverOnNull ? chartEntOpts.showHoverEffect : isNaN(value) ? 0 : chartEntOpts.showHoverEffect)),

                hoverColor,
                hoverBorderThickness = pluckNumber(entityJSON.borderhoverthickness, entityJSON.hoverborderthickness,
                    chartEntOpts.hoverBorderThickness),
                //hoverBorderColor = pluck(entityJSON.borderhovercolor, chartEntOpts.hoverBorderColor),
                //hoverBorderAlpha = pluck(entityJSON.borderhoveralpha, chartEntOpts.hoverBorderAlpha),

                fontBold = pluckNumber(entityJSON.fontbold, 0),
                link = entityJSON.link,
                showShadow = chartEntOpts.shadow,

                scaleStrokes = (!isIE || hasSVG),
                scaleFactor = rapi.sFactor / chartEntOpts.baseScaleFactor,

                scaledPixel = rapi.strokeWidth,
                scaledPixelWithBaseFactor = (scaleStrokes ?
                        chartEntOpts.baseScaleFactor : 1) * scaledPixel,

                hiddenEntityAttr = chartEntOpts.hiddenEntityFillObject ||
                    (chartEntOpts.hiddenEntityFillObject = { // used for hiding entities
                        fill: colorize({
                            color: chartEntOpts.hiddenEntityColor,
                            alpha: chartEntOpts.hiddenEntityAlpha
                        }).toString()
                    }),
                customStrokeWidthModifier,
                visibleEntityAttr,
                shadowOptions,
                alphaArr,
                conf = options[CONFIGKEY],
                baseWidth = conf._labelBaseWidth,
                baseHeight = conf._labelBaseHeight,
                xOffset = conf._labelXOffset,
                yOffset = conf._labelYOffset;

            // By default scaleBorder is false.
            if (scaleStrokes) {
                // SVG
                borderThickness = scaleBorder ? (borderThickness * scaledPixelWithBaseFactor) :
                    (borderThickness / scaleFactor);
                connectorThickness = connectorThickness / scaleFactor;
                customStrokeWidthModifier = scaleBorder ? scaleFactor : rapi.sFactor;

                if (isWebKit) {
                    // webkit issue fix
                    borderThickness = (borderThickness && mathCeil(borderThickness)) || 0;
                    connectorThickness = (connectorThickness && mathCeil(connectorThickness)) || 0;
                }
            }
            else {
                // VML
                borderThickness = scaleBorder ? borderThickness * scaledPixel : borderThickness;
                customStrokeWidthModifier = scaleBorder ? rapi.scaleFactor : chartEntOpts.baseScaleFactor;
            }


            if (!chartEntOpts.showHiddenEntityBorder) {
                hiddenEntityAttr['stroke-width'] = 0;
            }

            if (hoverBorderThickness === undefined) {
                hoverBorderThickness = borderThickness;
            }
            // Do scaling calculation of hover related strokes.
            else if (scaleStrokes) {
                hoverBorderThickness = scaleBorder ? (borderThickness * scaledPixelWithBaseFactor) :
                    (hoverBorderThickness / scaleFactor);

                if (isWebKit) {
                    // webkit issue fix
                    hoverBorderThickness = (hoverBorderThickness && mathCeil(hoverBorderThickness)) || 0;
                }
            }
            else {
                // VML
                hoverBorderThickness = scaleBorder ? hoverBorderThickness * scaledPixel : hoverBorderThickness;
            }

            if (!chartEntOpts.showNullEntityBorder && isNaN(value)) {
                borderThickness = 0;
            }

            if (pluck(entityJSON.color, entityJSON.alpha,
                    entityJSON.angle, entityJSON.ratio) !== undefined) {
                color = pluck(entityJSON.color, chartEntOpts.fillColor);
                alpha = pluck(entityJSON.alpha, chartEntOpts.fillAlpha);
                angle = pluck(entityJSON.angle, chartEntOpts.fillAngle);
                ratio = pluck(entityJSON.ratio, chartEntOpts.fillRatio);

                fillColor = colorize({
                    color: color,
                    alpha: alpha,
                    angle: angle,
                    ratio: ratio
                });
            }
            else {
                if (!chartEntOpts.fillColorObject) {
                    chartEntOpts.fillColorObject = colorize({
                        color: pluck(chartEntOpts.fillColor),
                        alpha: pluck(chartEntOpts.fillAlpha),
                        angle: pluck(chartEntOpts.fillAngle),
                        ratio: pluck(chartEntOpts.fillRatio)
                    });
                }

                if (!chartEntOpts.emptyColorObject) {
                    chartEntOpts.emptyColorObject = colorize({
                        color: pluck(chartEntOpts.nullEntityColor),
                        alpha: pluck(chartEntOpts.nullEntityAlpha),
                        angle: pluck(chartEntOpts.nullEntityAngle),
                        ratio: pluck(chartEntOpts.nullEntityRatio)
                    });
                }

                fillColor = isNaN(value) ? chartEntOpts.emptyColorObject : chartEntOpts.fillColorObject;
                color = fillColor.FCcolor.color;
                alpha = fillColor.FCcolor.alpha;
                angle = fillColor.FCcolor.angle;
                ratio = fillColor.FCcolor.ratio;
            }

            // Need to re-check whether tooltip is to be shown for blank
            // tooltext
            if (toolText === BLANK) {
                showTooltip = 0;
            }

            visibleEntityAttr = {
                transform: (hasSVG || !isIE) ? '' : rapi.transformStr,
                stroke: convertColor(borderColor, borderAlpha),
                'stroke-width': borderThickness,
                fill: (this.fillColor = fillColor).toString()
            };

            alphaArr = alpha.split(COMMA);

            if (borderThickness) {
                alphaArr.push(borderAlpha);
            }

            shadowOptions = {
                scalefactor: [scaleFactor, rapi.sFactor],
                opacity: mathMax.apply(math, alphaArr) / 100
            };

            if (useHoverColor) {
                if (pluck(entityJSON.fillhovercolor, entityJSON.fillhoveralpha, entityJSON.fillhoverangle,
                    entityJSON.fillhoverratio, entityJSON.hoverfillcolor, entityJSON.hoverfillalpha,
                    entityJSON.hoverfillratio, entityJSON.hoverfillangle) !== undefined) {

                    color = pluck(entityJSON.fillhovercolor, entityJSON.hoverfillcolor, chartEntOpts.hoverFillColor);
                    alpha = pluck(entityJSON.fillhoveralpha, entityJSON.hoverfillalpha, chartEntOpts.hoverFillAlpha);
                    angle = pluck(entityJSON.fillhoverangle, entityJSON.hoverfillangle, chartEntOpts.hoverFillAngle);
                    ratio = pluck(entityJSON.fillhoverratio, entityJSON.hoverfillratio, chartEntOpts.hoverFillRatio);

                    hoverColor = colorize({
                        color: color,
                        alpha: alpha,
                        angle: angle,
                        ratio: ratio
                    });
                }
                else {
                    if (!chartEntOpts.hoverColorObject) {
                        chartEntOpts.hoverColorObject = colorize({
                            color: chartEntOpts.hoverFillColor,
                            alpha: chartEntOpts.hoverFillAlpha,
                            angle: chartEntOpts.hoverFillAngle,
                            ratio: chartEntOpts.hoverFillRatio
                        });
                    }

                    hoverColor = chartEntOpts.hoverColorObject;
                }

                this.hoverColor = hoverColor;
            }

            this.value = value;

            this.addMouseGestures = addMouseGestures;
            this.attr = attr;
            this.draw = draw;
            this.drawLabel = drawLabel;
            this.getLabelObject = getLabelObject;
            this.destroy = destroy;
            this.show = show;
            this.hide = hide;
            this.hasFeature = hasFeature;
            this.drawLabelConnectors = drawLabelConnectors;

            draw.call(this);

            if (chartEntOpts.hideNullEntities && value === undefined) {
                this.hide();
            }
        },

        MarkerItem = function (id, markerDefinition, markerApplication, rapi) {

            this.id = id;
            this.definition = markerDefinition;
            this.application = markerApplication;
            this.rapi = rapi;

            // new member variables for value markers.
            this.hasValue = null;
            this.value =  null;
            this.options = null;

            this.label = null;
            this.markerShape = null;
            this.markerLabel = null;

            this.drawOptions = {shape: null, label: null};

            this.drawComplete = false;

            var chartOptions = rapi.options;

            if (chartOptions) {
                this._conf = chartOptions[CONFIGKEY];
            }

            this.init();
        },

        ConnectorItem = function (options, from, to, rapi) {
            this.options = options;
            this.from = from;
            this.to = to;
            this.api = rapi;

            var chartOptions = rapi.options;

            if (chartOptions) {
                this._conf = chartOptions[CONFIGKEY];
            }
        },

        Markers = function (markerJSON, rapi) {

            var appliedMarkers = {},
                shapeObjs = {},
                items = {},
                connectors = [],
                markerConfig = rapi.options.markers,
                connectorConfig = rapi.options.connectors,
                jsonData = markerJSON,
                annotations = rapi.mapAnnotations,
                markerGroup,
                markerLabelGroup,
                groupObj,
                i,
                groups = [];

            this.items = items;

            /**
             * Set the <map> level attributes that pertain to markers and connectors
             * to the prototype of the MarkerItem class and ConnectorItem class
             * respectively.
             */
            function setDefaultValues () {

                var chartMarkerOpts = markerConfig,
                    chartConnOpts = connectorConfig,
                    markerProto = MarkerItem.prototype,
                    connectorProto = ConnectorItem.prototype,
                    markerHover,
                    connectorHover;

                /**
                 * @todo optimize code by using object literals to create the prototype objects for markers and
                 * connectors.
                 */
                // Need to set a flag to check if any of the hover attributes have been set
                // by the user or not.
                markerHover = Boolean(pluck(chartMarkerOpts.hoverFillColor, chartMarkerOpts.hoverFillAlpha,
                    chartMarkerOpts.hoverFillAngle, chartMarkerOpts.hoverFillRatio,
                    chartMarkerOpts.hoverBorderThickness, chartMarkerOpts.hoverBorderColor,
                    chartMarkerOpts.hoverBorderAlpha));

                // set the default values given in the chart in the MarkerItem's prototype.
                markerProto.markerFont = chartMarkerOpts.dataLabels.style.fontFamily;
                markerProto.markerFontSize = chartMarkerOpts.dataLabels.style.fontSize;
                markerProto.markerFontColor = chartMarkerOpts.dataLabels.style.fontColor;
                markerProto.showMarkerTooltip = chartMarkerOpts.showTooltip;
                markerProto.showHoverEffect = markerHover;
                markerProto.tooltext = chartMarkerOpts.tooltext;
                markerProto.showMarkerLabels = chartMarkerOpts.showLabels;
                markerProto.markerLabelPadding = chartMarkerOpts.labelPadding;
                markerProto.labelWrapWidth = chartMarkerOpts.labelWrapWidth;
                markerProto.labelWrapHeight = chartMarkerOpts.labelWrapHeight;
                markerProto.labelSepChar = chartMarkerOpts.labelSepChar;
                markerProto.tooltipSepChar = chartMarkerOpts.tooltipSepChar;
                markerProto.fillColor = chartMarkerOpts.fillColor;
                markerProto.fillAlpha = chartMarkerOpts.fillAlpha;
                markerProto.fillRatio = chartMarkerOpts.fillRatio;
                markerProto.fillAngle = chartMarkerOpts.fillAngle;
                markerProto.hoverFillColor = chartMarkerOpts.hoverFillColor;
                markerProto.hoverFillAlpha = chartMarkerOpts.hoverFillAlpha;
                markerProto.hoverFillRatio = chartMarkerOpts.hoverFillRatio;
                markerProto.hoverFillAngle = chartMarkerOpts.hoverFillAngle;
                markerProto.startAngle = chartMarkerOpts.startAngle;
                markerProto.shapeId = chartMarkerOpts.shapeId;
                markerProto.borderThickness = chartMarkerOpts.borderThickness;
                markerProto.borderColor = chartMarkerOpts.borderColor;
                markerProto.borderAlpha = chartMarkerOpts.borderAlpha;
                markerProto.hoverBorderThickness = chartMarkerOpts.hoverBorderThickness;
                markerProto.hoverBorderColor = chartMarkerOpts.hoverBorderColor;
                markerProto.hoverBorderAlpha = chartMarkerOpts.hoverBorderAlpha;
                markerProto.markerRadius = chartMarkerOpts.radius;
                markerProto.autoScale = chartMarkerOpts.autoScale ? rapi.sFactor : 1;
                markerProto.shadow = chartMarkerOpts.shadow;
                markerProto.applyAll = chartMarkerOpts.applyAll;
                markerProto.dataEnabled = chartMarkerOpts.dataEnabled;
                markerProto.valueToRadius = chartMarkerOpts.valueToRadius;

                // Need to set a flag to check if any of the hover attributes have been set
                // by the user or not.
                connectorHover = Boolean(pluck(chartConnOpts.hoverthickness,
                    chartConnOpts.hovercolor, chartConnOpts.hoveralpha));

                connectorProto.showHoverEffect = connectorHover;
                connectorProto.showTooltip = chartConnOpts.showTooltip;
                connectorProto.tooltext = chartConnOpts.tooltext;
                connectorProto.thickness = chartConnOpts.thickness;
                connectorProto.color = chartConnOpts.color;
                connectorProto.alpha = chartConnOpts.alpha;
                connectorProto.hoverThickness = chartConnOpts.hoverthickness;
                connectorProto.hoverColor = chartConnOpts.hovercolor;
                connectorProto.hoverAlpha = chartConnOpts.hoveralpha;
                connectorProto.dashed = chartConnOpts.dashed;
                connectorProto.dashlen = chartConnOpts.dashLen;
                connectorProto.dashgap = chartConnOpts.dashGap;
                connectorProto.font = chartConnOpts.font;
                connectorProto.fontsize = chartConnOpts.fontSize;
                connectorProto.fontcolor = chartConnOpts.fontColor;
                connectorProto.bgcolor = chartConnOpts.labelBgColor;
                connectorProto.bordercolor = chartConnOpts.labelBorderColor;
                connectorProto.shadow = chartConnOpts.shadow;
                connectorProto.hideOpen = chartConnOpts.hideOpen;
            }

            /**
             * Create objects for the markers and shapes as per their definition.
             */
            function defineMarkersNShapes () {

                var defineArr = jsonData.definition,
                    defineObject = convertToObj(defineArr) || {},
                    applyObject = convertToObj(jsonData.application) || {},
                    shapeArr = jsonData.shapes,
                    i,
                    markerObj,
                    item,
                    shapeId,
                    id;

                if (!defineArr || !defineArr.length) {
                    return;
                }

                if (shapeArr && shapeArr.length) {
                    i = shapeArr.length;
                    for (; i; i -= 1) {
                        item = shapeArr[i - 1];
                        if ((id = item.id.toLowerCase())) {
                            shapeObjs[id] = item;
                        }
                    }
                }

                for (id in defineObject) {

                    item = defineObject[id];
                    markerObj = new MarkerItem(id, item, applyObject[id], rapi);
                    shapeId = markerObj.getShapeId();

                    if (shapeId) {
                        markerObj.shapeObj = shapeObjs[shapeId];
                    }

                    items[id] = markerObj;
                }
            }

            /**
             * Parse the connector objectd and draw them.
             */
            function drawConnectors () {

                var showLabels = connectorConfig.showLabels,
                    connArr = jsonData.connectors,
                    i = connArr && connArr.length,
                    connectorItems = [],
                    connectorLabelItems = [],
                    fromMarker,
                    toMarker,
                    connectJSON,
                    connectItem,
                    obj;

                if (i) {
                    groups.push({
                        id: 'connectorLabels',
                        fillalpha: '100',
                        items: connectorLabelItems
                    });

                    groups.push({
                        id: 'connectors',
                        fillalpha: '100',
                        items: connectorItems
                    });

                    while (i--) {
                        obj = connArr[i];

                        if (!obj.from || !obj.to) {
                            continue;
                        }

                        fromMarker = items[obj.from.toLowerCase()];
                        toMarker = items[obj.to.toLowerCase()];

                        if (!fromMarker || !toMarker) {
                            continue;
                        }

                        if (connectorConfig.hideOpen &&
                                (fromMarker._isHidden || toMarker._isHidden)) {
                            continue;
                        }

                        connectors.push(connectItem = new ConnectorItem(obj, fromMarker, toMarker, rapi));
                        connectItem.connectJSON = connectJSON = connectItem.computeConnectorJSON();

                        if (connectJSON) {
                            connectorItems.push(connectJSON);
                            if (connectJSON.label && showLabels) {
                                connectorLabelItems.push(connectItem.getLabelJSON());
                            }
                        }
                    }
                }
            }

            /**
             * Function to parse the markers provided in the new format. The markers
             * provided here may or may not have values associated with them.
             */
            function parseMarkers () {

                var markerData = jsonData[MARKER_ITEM_KEY],
                    shapeArr = jsonData.shapes,
                    value,
                    i,
                    markerObj,
                    item,
                    shapeId,
                    id;

                if (!markerData || !markerData.length) {
                    return;
                }

                if (shapeArr && shapeArr.length) {
                    i = shapeArr.length;
                    for (; i; i -= 1) {
                        item = shapeArr[i - 1];
                        if ((id = item.id.toLowerCase())) {
                            shapeObjs[id] = item;
                        }
                    }
                }

                i = markerData.length;

                while (i--) {
                    item = markerData[i];

                    if ((id =  (item.id && item.id.toLowerCase()))) {
                        if (item.value !== undefined && item.value !== '') {
                            value = parseFloat(item.value);
                        }

                        item.mapItem = markerObj = new MarkerItem(id, item, null, rapi);
                        shapeId = markerObj.getShapeId();

                        if (item.__hideMarker) {
                            markerObj._isHidden = true;
                        }

                        if (shapeId) {
                            markerObj.shapeObj = shapeObjs[shapeId];
                        }

                        items[id] = markerObj;
                    }
                }
            }

            function addMarkerItem (options) {

                var item = options,
                    markerObj,
                    drawOptions,
                    shapeId,
                    id;

                if ((id = item.id.toLowerCase())) {

                    if (items[id]) {
                        return;
                    }

                    // Data enabled markers not yet supported by this method.
                    delete item.value;

                    markerObj = new MarkerItem(id, item, null, rapi);
                    shapeId = markerObj.getShapeId();

                    if (shapeId) {
                        markerObj.shapeObj = shapeObjs[shapeId];
                    }

                    items[id] = markerObj;
                    drawOptions = markerObj.draw();

                    if (markerGroup && markerLabelGroup) {
                        markerObj.markerShape = drawOptions.markerShape &&
                            markerGroup.addItem(drawOptions.markerShape, true);
                        markerObj.markerLabel = drawOptions.markerLabel &&
                            markerLabelGroup.addItem(drawOptions.markerLabel, true);
                    }
                }
            }

            /**
             * Draw the markers after preparing them.
             */
            function applyMarkers () {

                // get the shape args
                var itemList = items,
                    markerItems = [],
                    markerLabels = [],
                    appliedObj,
                    markerItem,
                    shapeId,
                    id;

                markerGroup = annotations.addGroup({
                    fillalpha: '100',
                    items: markerItems
                });

                markerLabelGroup = annotations.addGroup({
                    items: markerLabels
                });

                for (id in itemList) {

                    appliedObj = null;
                    markerItem = itemList[id];
                    shapeId = markerItem.getShapeId();

                    if (markerItem && !markerItem._isHidden) {
                        if (shapeId) {
                            markerItem.shapeObj = shapeObjs[shapeId];
                        }
                        appliedObj = markerItem.draw();
                    }

                    if (!appliedObj) {
                        continue;
                    }

                    markerItem._annotationIndex = markerItems.length;
                    appliedMarkers[id] = markerItem;

                    markerItem.markerShape = appliedObj.markerShape &&
                        markerGroup.addItem(appliedObj.markerShape);
                    markerItem.markerLabel = appliedObj.markerLabel &&
                        markerLabelGroup.addItem(appliedObj.markerLabel);
                }
            }

            /**
             * @todo: remove
             * destroy is not needed because the destruction is handled by annotations.
            function destroy () { // jshint ignore: line

                var mark = this,
                    items = mark.items,
                    i = (items && items.length) || 0;

                while (i--) {
                    items[i].destroy();
                }

                mark.group.destroy();
                delete mark.group;
            }
             */

            setDefaultValues();

            /**
             * @note: Should data enabled markers be checked for using the attribute
             * useValuesForMarkers?
             */
            if (markerConfig.dataEnabled) {

                // Parse the marker items.
                parseMarkers();

                // Draw markers.
                applyMarkers();

                // Draw connectors.
                drawConnectors();
            }
            else {

                // Define markers.
                defineMarkersNShapes();

                // Draw markers.
                applyMarkers();

                // Draw connectors.
                drawConnectors();
            }

            i = groups.length;

            rapi.internalAnnotations = {};
            while (i--) {
                groupObj = groups.shift();
                if (groupObj.id) {
                    rapi.internalAnnotations[groupObj.id] = annotations.addGroup(groupObj);
                }
                else {
                    annotations.addGroup(groupObj);
                }
            }

            // To call from eiMethods addMarker.
            this.addMarkerItem = addMarkerItem;
        };

    ConnectorItem.prototype = {

        constructor: ConnectorItem,

        computeConnectorJSON: function () {

            var connect = this,
                api = connect.api,
                options = connect.options,
                fromMarker = connect.from,
                toMarker = connect.to,
                link = options.link,
                label = options.label,
                showTooltip = pluckNumber(options.showtooltip, connect.showTooltip),
                toolText = showTooltip ? pluck(options.tooltext, connect.tooltext) : BLANK,
                thickness = pluck(options.thickness, connect.thickness),
                color = pluck(options.color, connect.color),
                alpha = pluck(options.alpha, connect.alpha),
                hovereffect = pluckNumber(options.showhovereffect, connect.showHoverEffect),
                hovercolor = pluck(options.hovercolor, connect.hoverColor, color),
                hoveralpha = pluck(options.hoveralpha, connect.hoverAlpha, alpha),
                hoverthickness = pluck(options.hoverthickness, connect.hoverThickness, thickness),
                dashed = pluck(options.dashed, connect.dashed),
                dashLen = pluckNumber(options.dashlen, connect.dashlen),
                dashGap = pluckNumber(options.dashgap, connect.dashgap),
                eventArgs;

            if (toolText) {
                connect.tooltext = toolText = parseUnsafeString(parseTooltext(toolText, [3, 40, 41, 42, 43], {
                    label: label,
                    fromId: fromMarker.definition.id,
                    toId: toMarker.definition.id,
                    fromLabel: fromMarker.definition.label,
                    toLabel: toMarker.definition.label
                }, options));
            }

            if (!fromMarker || !toMarker) {
                return null;
            }
            else {

                eventArgs = {
                    fromMarkerId: fromMarker.id,
                    toMarkerId: toMarker.id,
                    label: label
                };

                return extend2({
                        type: 'line'
                    },
                    {
                        x: fromMarker.definition.x,
                        y: fromMarker.definition.y,
                        tox: toMarker.definition.x,
                        toy: toMarker.definition.y,
                        dashed: dashed,
                        dashlen: dashLen,
                        dashgap: dashGap,
                        link: link,
                        tooltext: showTooltip ? toolText : BLANK,
                        thickness: thickness,
                        color: color,
                        alpha: alpha,
                        label: label,
                        showshadow: connect.shadow,
                        _hovereffect: hovereffect,
                        _defaultattrs: {
                            stroke: colorize({
                                color: color,
                                alpha: alpha
                            }).toString(),
                            'stroke-width': thickness
                        },
                        _hoverattrs: {
                            stroke: colorize({
                                color: hovercolor,
                                alpha: hoveralpha
                            }).toString(),
                            'stroke-width': hoverthickness
                        },

                        onmouseover: function (e) {
                            var shape = e.data,
                                wrapper = shape.wrapper;

                            if (wrapper && shape.options._hovereffect) {
                                resetLastHover.call(api);

                                wrapper.attr(shape.options._hoverattrs);
                            }
                            /**
                             * In maps, markers are used to denote important or essential locations.
                             * We might encounter situations where we will need to connect markers to make the
                             * information more lucid. `Connectors` are used to connect markers.
                             * The `connectorRollOver` event is fired when the pointer is rolled over the connector.
                             *
                             * @event FusionCharts#connectorRollOver
                             * @group map
                             *
                             * @param {string} fromMarkerId The Id of the marker from which the connector starts.
                             * @param {string} toMarkerId The Id of the marker to which the connector is drawn.
                             * @param {label} label The label on the connector.
                             *
                             */
                            global.raiseEvent('connectorrollover', eventArgs, api.fusionCharts, e);
                        },

                        onmouseout: function (e) {
                            var shape = e.data,
                                wrapper = shape.wrapper;

                            if (wrapper && shape.options._hovereffect) {
                                wrapper.attr(shape.options._defaultattrs);
                            }
                            /**
                             * In maps, markers are used to denote important or essential locations. We might encounter
                             * situations where we will need to connect markers to make the information more lucid.
                             * `Connectors` are used to connect markers. The `connectorRollOut` event is fired when the
                             * pointer is rolled out of the connector. The {@link FusionCharts#event:connectorRollOver}
                             * event precedes this event.
                             *
                             * @event FusionCharts#connectorRollOut
                             * @group map
                             * @see FusionCharts#event:connectorRollOver
                             *
                             * @param {string} fromMarkerId The Id of the marker from which the connector starts.
                             * @param {string} toMarkerId The Id of the marker to which the connector is drawn.
                             * @param {label} label The label on the connector.
                             */
                            global.raiseEvent('connectorrollout', eventArgs, api.fusionCharts, e);
                        },

                        onclick: function (e) {
                            /**
                             * In maps, markers are used to denote important or essential locations.
                             * We might encounter situations where we will need to connect markers to make the
                             * information more lucid. `Connectors` are used to connect markers.
                             * The `connectClick` event is fired when a connector is clicked. It is preceded by
                             * the {@link FusionCharts#event:connectorRollOver} event.
                             *
                             * @event FusionCharts#connectorClick
                             * @param {string} fromMarkerId The Id of the marker from which the connector starts.
                             * @param {string} toMarkerId The Id of the marker to which the connector is drawn.
                             * @param {label} label The label on the connector.
                             *
                             * @example
                             *     //declaring the fusioncharts object.
                             *     var myMap = new FusionCharts( "Maps/FCMap_World.swf", "myMapId", "400", "300", "0" );
                             *     //setting the data source.
                             *     myMap.setXMLUrl("Data.xml");
                             *     //rendering the chart in the associated Div.
                             *     myMap.render("mapContainer");
                             *
                             *     //function to perform the necessary action on capturing the connectorClicked event.
                             *     //alert the user with the from and to marker id's.
                             *     function listenerEvent(eventObject, argumentsObject){
                             *         alert( "From marker ID: "+ argumentsObject.fromMarkerId + ",
                             *                         To marker ID: " + argumentsObject.toMarkerId);
                             *     }
                             *
                             *     //listening to the connector click event
                             *     FusionCharts("myMapId").addEventListener ("connectorClicked" , listenerEvent );
                             *
                             */
                            global.raiseEvent('connectorClick', eventArgs, api.fusionCharts, e);
                        }
                    });
            }
        },

        getLabelJSON: function () {

            var connect = this,
                connectJSON = connect.connectJSON;

            return extend2({
                    type: 'text'
                }, {
                    x: ((Number(connectJSON.x) + Number(connectJSON.tox)) / 2).toString(),
                    y: ((Number(connectJSON.y) + Number(connectJSON.toy)) / 2).toString(),
                    text: connectJSON.label,
                    align: POSITION_CENTER,
                    valign: POSITION_MIDDLE,
                    font: connect.font,
                    fontsize: (connect.fontsize / connect.api.sFactor),
                    fillcolor: connect.fontcolor,
                    bgcolor: connect.bgcolor,
                    bordercolor: connect.bordercolor,
                    tooltext: connect.tooltext
                });
        }
    };

    MarkerItem.prototype = {

            constructor: MarkerItem,

            /**
             * Initialize the marker with the options that have to be arrived at by
             * merging the definition & application provided in the chart data OR
             * if the markers has the new data format the options have to set as the definition.
             */
            init: function () {
                var mark = this,
                    opts;

                opts = mark.options = extend2({}, mark.definition);

                if (mark.dataEnabled) {
                    if (!isNaN(opts.value) && opts.value !== '') {
                        mark.value = parseFloat(opts.value);
                        mark.hasValue = true;
                    }
                }
                else if (mark.applyAll) {
                    mark.options = extend2(opts, mark.application);
                }
                else if (mark.application) {
                    mark.options = extend2(opts, mark.application);
                }
            },

            getShapeId: function () {
                return this.options.shapeid && this.options.shapeid.toLowerCase();
            },

            getLabelOptions: function (labelPos, labelPadding, options, width, height) {

                var mark = this,
                    radius,
                    x,
                    y,
                    alignment = labelPos && labelPos.toLowerCase();

                // validate alignments
                if (!mark.getLabelAlignment[alignment]) {
                    alignment = 'center';
                }

                x = Number(options.x),
                y = Number(options.y);

                if (width === undefined || height === undefined) {
                    // not an image
                    radius = options.radius || 0;
                }
                else {
                    // image
                    radius = /^(top|bottom)$/ig.test(alignment) && (height * 0.5) ||
                            /^(left|right)$/ig.test(alignment) && (width * 0.5) || 0;
                }

                radius = (Number(radius) + Number(labelPadding));
                return mark.getLabelAlignment[alignment](x, y, radius);
            },

            draw: function () {


                if (!this.options) {
                    return;
                }

                var mark = this,
                    api = mark.rapi,
                    conf = mark._conf,
                    plotLeft = api.translateX,
                    plotTop = api.translateY,
                    options = mark.options,
                    shapeId = options.shapeid,
                    itemScale = (options.scale || 1),
                    label = options.label || BLANK,
                    labelPos = (options.labelpos || POSITION_TOP).toLowerCase(),
                    value = (options.formattedValue === undefined) ? undefined : options.formattedValue,
                    tooltext = options.tooltext || mark.tooltext,
                    radius = (pluckNumber(options.radius, mark.markerRadius) * itemScale * mark.autoScale) || 0.0001,
                    fillcolor = pluck(options.fillcolor, options.color, mark.fillColor),
                    fillalpha = pluck(options.fillalpha, options.alpha, mark.fillAlpha),
                    fillratio = pluck(options.fillratio, mark.fillRatio),
                    fillangle = pluck(options.fillangle, mark.fillAngle),
                    borderthickness = pluckNumber(options.borderthickness, mark.borderThickness),
                    bordercolor = pluck(options.bordercolor, mark.borderColor),
                    borderalpha = pluck(options.borderalpha, mark.borderAlpha),
                    labelPadding = (options.labelpadding || mark.markerLabelPadding),
                    labelObj,
                    align,
                    valign,
                    baseWidth,
                    baseHeight,
                    xOffset,
                    yOffset,
                    wrapWidth,
                    wrapHeight,
                    shapeObj;

                if (!shapeId) {
                    return;
                }

                if (tooltext) {
                    tooltext = parseUnsafeString(parseTooltext(tooltext, [1, 2, 3], {
                        formattedValue: value,
                        label: label
                    }, options));
                }
                else {
                    tooltext = (value ? (label + mark.tooltipSepChar + value) : label);
                }

                shapeId = shapeId.toLowerCase();

                if (value !== undefined && value !== null) {
                    /* value_for_markers */
                    label = label + mark.labelSepChar + value;
                }
                else {

                    if (!isNaN(itemScale)) {
                        if (itemScale < 0) {
                            itemScale = 0;
                        }
                        else if (itemScale > 5) {
                            itemScale = 5;
                        }
                    }
                    else {
                        itemScale = 1;
                    }
                }


                options = {
                    x: options.x.toString(),
                    y: options.y.toString(),
                    fillcolor: fillcolor,
                    fillalpha: fillalpha,
                    fillratio: fillratio,
                    fillangle: fillangle,
                    borderthickness: borderthickness,
                    bordercolor: bordercolor,
                    borderalpha: borderalpha,
                    hovereffect: pluck(options.showhovereffect, mark.showHoverEffect),
                    radius: radius.toString(),
                    tooltext: (mark.showMarkerTooltip ? tooltext : BLANK),
                    link: options.link,
                    showshadow: pluckNumber(options.showshadow, mark.shadow),
                    _markerLabel: label, // for event
                    _markerId: options.id, // for event
                    id: (options.id + BLANK).toLowerCase(),

                    onmouseover: function (e) {
                        var shape = e.data,
                            options = shape.options,
                            bounds = shape.bounds,
                            eventArgs = options._markerEventArgs,
                            wrapper = shape.wrapper;

                        if (wrapper && options.hovereffect) {
                            resetLastHover.call(api);
                            wrapper.attr(options._hoverattrs);
                        }

                        if (!eventArgs) {
                            eventArgs = options._markerEventArgs = {
                                x: bounds.x1 / bounds.xs,
                                y: bounds.y1 / bounds.ys,
                                scaledX: bounds.x1,
                                scaledY: bounds.y1,
                                chartX: plotLeft + bounds.x1,
                                chartY: plotTop + bounds.y1,
                                id: options._markerId,
                                label: options._markerLabel
                            };
                        }
                        /**
                         * ``Markers`` are used to denote important or essential points in a map.
                         * e.g In an India map , markers might be used to denote capitals of the different states.
                         * The markerRollOver event is fired when the pointer is rolled over a marker.
                         * @event FusionCharts#markerRollOver
                         * @group map
                         *
                         * @param {number} x The original X co-ordinate of the marker.
                         * @param {number} y The original Y co-ordinate of the marker.
                         * @param {number} scaledX The scaled value of X co-ordinate of the marker.
                         * @param {number} scaledY The scaled value of Y co-ordinate of the marker.
                         * @param {number} chartX The x position of the marker with respect to the top-left
                         * corner of the map canvas (that is 0,0 position).
                         * @param {number} chartY The y position of the marker with respect to the top-left
                         * corner of the map canvas (that is 0,0 position).
                         * @param {string} label The label of the marker.
                         *
                         * @example
                         * //declaring the FusionCharts object.
                         * var myMap = new FusionCharts( "Maps/FCMap_World.swf", "myMapId", "400", "300", "0" );
                         * //passing the data to the object in *XML* format.
                         * myMap.setXMLUrl("Data.xml");
                         * //rendering the chart in the map container.
                         * myMap.render("mapContainer");
                         *
                         * //the function which gets executed when the MarkerRollOver event is captured.
                         * function myChartListener(eventObject, argumentsObject){
                         *     alert([
                         *         "ID: ", argumentsObject.id, "; Label: ", argumentsObject.label,
                         *         "; x: ", argumentsObject.x, ", y: ", argumentsObject.x,
                         *         "; scaledX: ", argumentsObject.scaledX, ", scaledY: ", argumentsObject.scaledY,
                         *         "; chartX: ", argumentsObject.chartX, ", chartY: ", argumentsObject.chartY
                         *     ].join(""));
                         * }
                         *
                         * //listening to the markerRollOver event.
                         * FusionCharts("myMapId").addEventListener ("markerRollOver" , myChartListener );
                         *
                         */
                        global.raiseEvent('markerRollOver', eventArgs, api.fusionCharts, e);
                    },

                    onmouseout: function (e) {
                        var shape = e.data,
                            wrapper = shape.wrapper;

                        if (wrapper && shape.options.hovereffect) {
                            wrapper.attr(shape.options._defaultattrs);
                        }
                        /**
                         * `Markers` are used to denote important or essential points in a map.
                         * e.g In an India map , markers might be used to denote capitals of the different states.
                         * The `markerRollOut` event is fired when the pointer is rolled out of a marker.
                         * This event is usually preceded by the {@link FusionCharts#markerRollOver} or the
                         * {@link FusionCharts#markerClicked} event.
                         *
                         * @event FusionCharts#markerRollOut
                         * @group map
                         *
                         * @param {number} x The original X co-ordinate of the marker.
                         * @param {number} y The original Y co-ordinate of the marker.
                         * @param {number} scaledX The scaled value of X co-ordinate of the marker.
                         * @param {number} scaledY The scaled value of Y co-ordinate of the marker.
                         * @param {number} chartX The x position of the marker with respect to the top-left
                         * corner of the map canvas (that is 0,0 position).
                         * @param {number} chartY The y position of the marker with respect to the top-left
                         * corner of the map canvas (that is 0,0 position).
                         * @param {string} label The label of the marker.
                         *
                         * @example
                         * //declaring the Fusion Charts object.
                         * var myMap = new FusionCharts( "Maps/FCMap_World.swf", "myMapId", "400", "300", "0" );
                         * //passing the data to the object in *XML* format.
                         * myMap.setXMLUrl("Data.xml");
                         * //rendering the chart in the map container.
                         * myMap.render("mapContainer");
                         *
                         * //the function which gets executed when the MarkerRollOut event is captured.
                         * function myChartListener(eventObject, argumentsObject){
                         *     alert([
                         *         "ID: ", argumentsObject.id, "; Label: ", argumentsObject.label,
                         *         "; x: ", argumentsObject.x, ", y: ", argumentsObject.x,
                         *         "; scaledX: ", argumentsObject.scaledX, ", scaledY: ", argumentsObject.scaledY,
                         *         "; chartX: ", argumentsObject.chartX, ", chartY: ", argumentsObject.chartY
                         *     ].join(""));
                         * }
                         *
                         * //listening to the markerRollOut event.
                         * FusionCharts("myMapId").addEventListener ("markerRollOut" , myChartListener );
                         *
                         */
                        global.raiseEvent('markerRollOut', shape.options._markerEventArgs, api.fusionCharts, e);
                    },
                    onclick: function (e) {
                        var shape = e.data;
                        /**
                         * `Markers` are used to denote important or essential points in a map.
                         * e.g In an India map , markers might be used to denote capitals of the different states.
                         * The markerClick event is fired when a marker is clicked.
                         * This event is usually preceded by the {@link FusionCharts#event:markerRollOver} event.
                         *
                         * By listening to this event , the user can retrieve the position of the marker and the label
                         * associated with it.
                         *
                         * @event FusionCharts#markerClick
                         * @group map
                         *
                         * @param {number} x The original X co-ordinate of the marker.
                         * @param {number} y The original Y co-ordinate of the marker.
                         * @param {number} scaledX The scaled value of X co-ordinate of the marker.
                         * @param {number} scaledY The scaled value of Y co-ordinate of the marker.
                         * @param {number} chartX The x position of the marker with respect to the top-left
                         * corner of the map canvas (that is 0,0 position).
                         * @param {number} chartY The y position of the marker with respect to the top-left
                         * corner of the map canvas (that is 0,0 position).
                         * @param {string} label The label of the marker.
                         *
                         * @example
                         * //declaring the Fusion Charts object.
                         * var myMap = new FusionCharts( "Maps/FCMap_World.swf", "myMapId", "400", "300", "0" );
                         * //passing the data to the object in *XML* format.
                         * myMap.setXMLUrl("Data.xml");
                         * //rendering the chart in the map container.
                         * myMap.render("mapContainer");
                         *
                         * //the function which gets executed when the MarkerClick event is captured.
                         * function myChartListener(eventObject, argumentsObject){
                         *     alert([
                         *         "ID: ", argumentsObject.id, "; Label: ", argumentsObject.label,
                         *         "; x: ", argumentsObject.x, ", y: ", argumentsObject.x,
                         *         "; scaledX: ", argumentsObject.scaledX, ", scaledY: ", argumentsObject.scaledY,
                         *         "; chartX: ", argumentsObject.chartX, ", chartY: ", argumentsObject.chartY
                         *     ].join(""));
                         * }
                         *
                         * //listening to the markerClicked event.
                         * FusionCharts("myMapId").addEventListener ("markerClicked" , myChartListener );
                         *
                         */
                        global.raiseEvent('markerClick', shape.options._markerEventArgs, api.fusionCharts, e);
                    }
                };

                if (shapeId === 'triangle') {
                    extend2(options, {
                        type: 'polygon',
                        sides: 3,
                        startangle: mark.startAngle

                    });
                }
                else if (shapeId === 'diamond') {
                    extend2(options, {
                        type: 'polygon',
                        sides: 4,
                        startangle: mark.startAngle
                    });
                }
                else if (shapeId === 'arc') {
                    extend2(options, {
                        type: 'arc',
                        startangle: 0,
                        endangle: 360,
                        innerradius: radius * INNERRADIUSFACTOR
                    });
                }
                else if (shapeId === 'circle') {
                    options.type = 'circle';
                }
                else {
                    shapeObj = mark.getShapeArgs();

                    if (!mark.dataEnabled || !mark.valueToRadius || options.radius === undefined) {
                        !shapeObj.radius && (shapeObj.radius = mark.markerRadius);
                        shapeObj.radius *= (itemScale * mark.autoScale);
                    }
                    else {
                        delete shapeObj.radius;
                    }

                    extend2(options, shapeObj);
                }

                // Setting the hover attributes after all the cosmetics have been finalized.
                extend2(options, {
                    hoverfillcolor: pluck(options.fillhovercolor, mark.hoverFillColor, options.fillcolor),
                    hoverfillalpha: pluck(options.fillhoveralpha, mark.hoverFillAlpha, options.fillalpha),
                    hoverfillratio: pluck(options.fillhoverratio, mark.hoverFillRatio, options.fillratio),
                    hoverfillangle: pluck(options.fillhoverangle, mark.hoverFillAngle, options.fillangle),
                    hoverborderthickness: pluckNumber(options.borderhoverthickness, mark.hoverBorderThickness,
                        options.borderthickness),
                    hoverbordercolor: pluck(options.borderhovercolor, mark.hoverBorderColor, options.bordercolor),
                    hoverborderalpha: pluck(options.borderhoveralpha, mark.hoverBorderAlpha, options.borderalpha)
                });

                /** Hover Effect for markers **/
                options._defaultattrs = {
                    fill: colorize({
                        alpha: options.fillalpha,
                        color: options.fillcolor,
                        angle: options.fillangle,
                        ratio: options.fillratio
                    }).toString(),
                    'stroke-width': options.showborder !== '0' ? options.borderthickness : 0,
                    stroke: convertColor(options.bordercolor, options.borderalpha)
                };

                options._hoverattrs = {
                    fill: colorize({
                        alpha: options.hoverfillalpha,
                        color: options.hoverfillcolor,
                        angle: options.hoverfillangle,
                        ratio: options.hoverfillratio
                    }).toString(),
                    'stroke-width': options.showborder !== '0' ? options.hoverborderthickness : 0,
                    stroke: convertColor(options.hoverbordercolor, options.hoverborderalpha)
                };

                if (options.type === 'image') {
                    // In case of image there should not be a border around it by default.
                    options.borderthickness = options.borderthickness || 0;

                    options.onload = function (imageattr) {
                        var shape = this,
                            options = shape.options,
                            width = imageattr.width,
                            height = imageattr.height,

                            // Recalculating x & y because by default annotations fx
                            // aligns the image to the top left corner.
                            // In this case the image needs to be centrally aligned.
                            calcX = (Number(options.x) - (width / (2 * api.sFactor))) * api.sFactor,
                            calcY = (Number(options.y) - (height / (2 * api.sFactor))) * api.sFactor,
                            item;


                        if (width && height) {
                            for (item in {wrapper: 1, tracker: 1}) {
                                shape[item] && shape[item].attr({
                                    x: calcX,
                                    y: calcY,
                                    width: width,
                                    height: height
                                });
                            }
                        }
                    };
                }

                mark.drawOptions.shape = options;
                if (!mark.showMarkerLabels) {
                    return {
                        markerShape: options
                    };
                }

                // creating marker label options here.
                labelPadding = (options.labelpadding || mark.markerLabelPadding),
                labelObj = mark.getLabelOptions(labelPos, labelPadding, options),
                align = labelObj.align,
                valign = labelObj.valign,
                baseWidth = conf._labelBaseWidth,
                baseHeight = conf._labelBaseHeight,
                xOffset = conf._labelXOffset,
                yOffset = conf._labelYOffset,

                wrapWidth = mark.labelWrapWidth ? mark.labelWrapWidth :
                    (mark.getWrapWidth[align](baseWidth, Number(labelObj.x) + xOffset)),
                wrapHeight = mark.labelWrapHeight ? mark.labelWrapHeight :
                    (mark.getWrapHeight[valign](baseHeight, Number(labelObj.y) + yOffset));


                if (wrapWidth > labelPadding) {
                    wrapWidth -= labelPadding;
                }
                if (wrapHeight > labelPadding) {
                    wrapHeight -= labelPadding;
                }

                mark.drawOptions.label = extend2({type: 'text'}, {
                    text: label,
                    tooltext: options.tooltext,
                    x: labelObj.x,
                    y: labelObj.y,
                    align: align,
                    valign: labelObj.valign,
                    wrap: 1,
                    wrapwidth: wrapWidth,
                    wrapheight: wrapHeight,
                    fontsize: mark.markerFontSize / api.sFactor,
                    font: mark.markerFont,
                    fillcolor: mark.markerFontColor
                });

                return {
                    markerShape: options,
                    markerLabel: mark.drawOptions.label
                };
            },

            show: function () {
                this.setMarkerVisibility(true);
            },

            hide: function () {
                this.setMarkerVisibility(false);
            },

            setMarkerVisibility: function (vis) {

                var mark = this,
                    annotByGrp = mark.rapi && mark.rapi.internalAnnotations,
                    annotGrp = annotByGrp && annotByGrp.markers,
                    elems = annotGrp && annotGrp.items,
                    markerElem;

                if (!elems) {
                    return;
                }

                markerElem = elems[mark._annotationIndex];

                if (markerElem) {
                    if (!mark._origFill) {
                        mark._origFill = colorize({
                            alpha: markerElem.fillAlpha,
                            color: markerElem.fillColor,
                            angle: markerElem.fillAngle,
                            ratio: markerElem.fillRatio
                        });

                        mark._hideFill = colorize({
                            alpha: '0',
                            color: markerElem.fillColor,
                            angle: markerElem.fillAngle,
                            ratio: markerElem.fillRatio
                        });
                    }

                    if (vis) {
                        markerElem.wrapper.attr({
                            fill: mark._origFill
                        });
                    }
                    else {
                        markerElem.wrapper.attr({
                            fill: mark._hideFill
                        });
                    }
                }
            },

            getShapeArgs: function () {

                var mark = this,
                    shapeObj = extend2({}, mark.shapeObj),
                    // FMXT-388: work on a copy of the shapeObj so as to not alter the original shapeObj.
                    radius;

                if (shapeObj) {
                    if (shapeObj.type === 'polygon') {
                        if (shapeObj.sides < 3) {
                            shapeObj.type = 'circle';
                        }
                        else {
                            shapeObj.startangle = mark.startAngle;
                        }
                    }
                    else if (shapeObj.type === 'arc') {
                        radius = (shapeObj.radius || mark.markerRadius) * mark.autoScale;
                        shapeObj.radius = radius;

                        shapeObj.innerradius = ((shapeObj.innerradius &&
                            (shapeObj.innerradius * mark.autoScale)) || (radius * INNERRADIUSFACTOR));
                    }

                    return shapeObj;
                }
                else {
                    return null;
                }
            },

            destroy: function () {
                var marker = this,
                    shape = marker.markerShape,
                    label = marker.markerLabel,
                    key;

                shape && shape.destroy();
                label && label.destroy();

                for (key in marker) {
                    delete marker[key];
                }
            },

            getLabelAlignment: {
                top: function (x, y, radius) {
                    return {
                        x: x.toString(),
                        y: (y - radius).toString(),
                        align: POSITION_CENTER,
                        valign: POSITION_TOP
                    };
                },
                left: function (x, y, radius) {
                    return {
                        x: (x - radius).toString(),
                        y: y.toString(),
                        align: POSITION_RIGHT,
                        valign: POSITION_MIDDLE
                    };
                },
                right: function (x, y, radius) {
                    return {
                        x: (x + radius).toString(),
                        y: y.toString(),
                        align: POSITION_LEFT,
                        valign: POSITION_MIDDLE
                    };
                },
                bottom: function (x, y, radius) {
                    return {
                        x: x.toString(),
                        y: (y + radius).toString(),
                        align: POSITION_CENTER,
                        valign: POSITION_BOTTOM
                    };
                },
                center: function (x, y) {
                    return {
                        x: x.toString(),
                        y: y.toString(),
                        align: POSITION_CENTER,
                        valign: POSITION_MIDDLE
                    };
                }
            },

            getWrapWidth: {
                right: function (width, x) {
                    return x;
                },
                left: function (width, x) {
                    return (width - x);
                },
                center: function (width, x) {
                    return (mathMin(x, width - x) * 2);
                }
            },

            getWrapHeight: {
                top: function (height, y) {
                    return y;
                },
                middle: function (height, y) {
                    return (mathMin(y, height - y) * 2);
                },
                bottom: function (height, y) {
                    return (height - y);
                }
            }
        };

    // Extend events
    extend(lib.eventList, {
        entityrollover: 'FC_Event',
        entityrollout: 'FC_Event'
    });

    /**
     * Definition of root geo-base. This definition has all the vizualization
     * routines required to draw maps (along with all base functionalities).
     *
     * All maps should inherit from this and simply redefine its data-definition
     * like "entities", "width", "height", "name", etc.
     */
    chartAPI(GEO, {
        name: GEO,
        friendlyName: 'Map',
        revision: 1,
        creditLabel: CREDITS,
        standaloneInit: false, // this map cannot be displayed alone

        // Since it internally uses annotations, suppress the annotation events
        annotationInteractionEvents: false,

        // set default margins
        charttopmargin: 10,
        chartrightmargin: 10,
        chartbottommargin: 10,
        chartleftmargin: 10,

        // Define the charts original (default) width and height. The user x,y
        // will be scaled as per this.
        baseWidth: 400,
        baseHeight: 300,
        baseScaleFactor: 1,
        defaultSeriesType: GEO,
        rendererId: 'maps',

        /*
         * Definition for geo entities (their labels and entity outlines)
         * ~type {object.<string, Object>}
         */
        entities: {
            /**
             * Data-structure definition for map entities.
             * @example
            "ab": {
                outlines: [
                // Outline can have more than once closed paths idicating
                // distinct and disjoint areas.
                    [M,188.6,29.4,L,189.8,30.05,189.8,30.1,Z]
                ],

                label: "AB Entity",
                shortLabel: "AB",
                labelPosition: [158.75,57.9],
                labelConnectors: []
            }
             */
        },

        draw: function (options, callback) {
            var logic = this,
                renderer = logic.renderer,
                chartObj = logic.chartInstance;

            if (!renderer) {
                renderer = logic.renderer = new chartAPI('renderer.' + logic.rendererId); // jshint ignore: line
            }

            logic.updateDefaultAnnotations();

            // Making the invocation of the callback event-based, as the map items drawing might
            // be done in batches (e.g entities) making the drawing asynchronous.
            // The map renderer has a checkComplete method that checks if the map is ready
            // and if ready raises the `internal.mapdrawingcomplete` event. In addition to being
            // invoked here (at the end of the `draw` method), the checkComplete method is
            // also called by the components that may be drawn asynchronously, after their
            // drawing is complete.
            chartObj.addEventListener('internal.mapdrawingcomplete', function (event, args) {
                callback && callback.apply(this, [args.renderer]);
                event.detachHandler(); // one-time
            });

            return renderer.init(logic, options, function (chart) {
                chart.checkComplete();
            });
        },

        chart: function (width, height) {

            // Since getHCJSON will not look into mapmargin* attributes, we need
            // to rename mapmargins to chartmargins.
            // Also, we need to set the default value for animation to 0 due to
            // performance issues.
            extend2(this.dataObj.chart, {
                charttopmargin: this.dataObj.chart.maptopmargin,
                chartrightmargin: this.dataObj.chart.maprightmargin,
                chartbottommargin: this.dataObj.chart.mapbottommargin,
                chartleftmargin: this.dataObj.chart.mapleftmargin,
                animation: this.dataObj.chart.animation || '0'
            });

            var iapi = this,

                // Reference to user-data object in FusionCharts native JSON
                // format.
                fc = this.dataObj,
                // Create default visualization logic for maps renderer.
                hc = getHCJSON(fc, width, height, iapi),

                // Access chart configuration options for both FusionCharts &
                // visualization logic.
                chartAttrs = fc.chart,
                markerAttrs = fc.markers,
                chartOptions = hc.chart,

                // Access the bypass objects that store all FusionCharts-specific
                // information/functions while being embedded through renderer.
                conf = hc[CONFIGKEY],

                roundEdges = chartOptions.useRoundEdges =
                        pluckNumber(chartAttrs.useroundedges) === 1,
                // attrs that go positive or negative upon round edges
                roundEdgePositive = roundEdges ? 1 : 0,
                roundEdgeNegative = roundEdges ? 0 : 1,

                lighting3d = chartOptions.use3DLighting =
                        pluckNumber(chartAttrs.use3dlighting, 1) === 1,
                defaultTooltipStyle = extend2({}, hc.tooltip.style),

                // Select the color palette
                palette = new ColorPalette (this.colorPaletteMap,
                        (chartAttrs.palette > 0 && chartAttrs.palette < 6 ?
                        chartAttrs.palette : pluckNumber(iapi.paletteIndex, 1)) - 1),

                inCanFontFamily = pluck(chartAttrs.basefont, 'Verdana,sans'),
                inCanFontSize =  pluckFontSize(chartAttrs.basefontsize, 10),
                inCancolor = pluck(chartAttrs.basefontcolor, palette.basefontcolor),

                fontSize = pluckFontSize(chartAttrs.outcnvbasefontsize,
                        inCanFontSize),

                outCanFontFamily = pluck(chartAttrs.outcnvbasefont,
                        inCanFontFamily),
                outCanFontSize = fontSize,
                outCanFontSizePx = fontSize + PX,
                outCanColor = hashify(pluck(chartAttrs.outcnvbasefontcolor,
                        inCancolor)),

                canBGColor = pluck(chartAttrs.bgcolor, chartAttrs.canvasbgcolor,
                        palette.canvasbgcolor),
                canBGAlpha = pluck(chartAttrs.bgalpha, chartAttrs.canvasbgalpha,
                        palette.canvasbgalpha),

                // Check whether markers are to be expected (or consumed) in
                // new data enabled format. If new format exists then true else if no old format exists, true again!
                markerDataEnabled = pluckNumber(chartAttrs.usevaluesformarkers, fc.markers && fc.markers.items &&
                    fc.markers.items.length, !(fc.markers && (fc.markers.application && fc.markers.application.length &&
                        fc.markers.definition && fc.markers.definition.length))),

                // The line heights are set after full style has been parsed.
                chartBorderThickness,
                bgImageDisplayMode,
                bgImageVAlign,
                bgImageHAlign,
                outCanLineHeight,
                inCanLineHeight,
                entityBorderColor,
                entityFillColor,
                entityFillAlpha,
                entityFillRatio,
                entityFillAngle,
                nullEntityColor,
                obj;

            // Append px string to the numeric font size and add '#' to the
            // color property of color
            inCanFontSize = inCanFontSize + PX;
            inCancolor = hashify(inCancolor);

            // Execute "postHCJSONCreation" hook (this is primarily for
            // real-time charts.)
            if (iapi.realtimeEnabled && iapi.postHCJSONCreation) {
                iapi.postHCJSONCreation.call(iapi, hc);
            }

            // Pass the click/link action management function.
            chartOptions.events.click = iapi.linkClickFN;

            // Pass the numberFormatter via conf (for legacy.)
            conf.numberFormatter = iapi.numberFormatter;

            // Point configuration to show label tooltext and data values
            extend2(conf, {
                // Save the original width and height in conf for future use in
                // scale and space management within geo series.
                width: width,
                height: height,

                // Save configuration options needed during drawing.
                showTooltip: pluckNumber(chartAttrs.showtooltip, iapi.showtooltip, 1),
                showHoverEffect: pluckNumber(chartAttrs.showhovereffect, 1),
                tooltipSepChar: pluck(chartAttrs.tooltipsepchar, COMMASPACE),
                showValues: pluckNumber(chartAttrs.showvalues, iapi.showValues, 1),
                showCanvasBG: pluck(chartAttrs.showcanvasbg, 1),
                useValuesForMarkers: markerDataEnabled,
                adjustViewPortForMarkers:
                    pluckNumber(chartAttrs.adjustviewportformarkers, markerDataEnabled),

                // Scrollbar related configurations
                flatScrollBars: pluckNumber(chartAttrs.flatscrollbars, 0),
                scrollBar3DLighting: pluckNumber(chartAttrs.scrollbar3dlighting, 1),

                // Set the default set of font styles
                outCanvasStyle: {
                    fontFamily: outCanFontFamily,
                    color: outCanColor,
                    fontSize:  outCanFontSizePx
                },
                inCanvasStyle: {
                    fontFamily: inCanFontFamily,
                    fontSize:  inCanFontSize,
                    color: inCancolor
                }
            });

            // Set line height post setting up of entire style object.
            outCanLineHeight = setLineHeight(conf.outCanvasStyle);
            inCanLineHeight = setLineHeight(conf.inCanvasStyle);
            // Trendstyle is set to ensure all dependent space-managers work!
            conf.trendStyle = conf.outCanvasStyle;

            if (conf.showCanvasBG == ZERO) {
                canBGAlpha = '0';
            }

            entityBorderColor = pluck(chartAttrs.entitybordercolor, chartAttrs.bordercolor, palette.plotbordercolor),
            entityFillColor = pluck(chartAttrs.entityfillcolor, chartAttrs.fillcolor, palette.plotfillcolor),
            entityFillAlpha = pluck(chartAttrs.entityfillalpha, chartAttrs.fillalpha, palette.plotfillalpha),
            entityFillRatio = pluck(chartAttrs.entityfillratio, chartAttrs.fillratio, palette.plotfillratio),
            entityFillAngle = pluck(chartAttrs.entityfillangle, chartAttrs.fillangle, palette.plotfillangle),
            nullEntityColor = pluck(chartAttrs.nullentityfillcolor, chartAttrs.nullentitycolor, entityFillColor);

            chartBorderThickness = pluckNumber(chartAttrs.showcanvasborder, roundEdgeNegative) ?
                pluckNumber(chartAttrs.canvasborderthickness, 1) : 0;

            extend2(hc, {

                chart: {
                    emulateFlashGutter: pluckNumber(chartAttrs._emulateflashgutter, 1),
                    defaultSeriesType: iapi.defaultSeriesType, // series-type
                    paletteIndex: palette.index, // color palette index

                    // chart border and background attributes
                    // For maps, the canvas attributes are cross mapped to chart
                    // border
                    borderRadius: pluckNumber(chartAttrs.canvasborderradius, 0),
                    borderColor: convertColor(pluck(chartAttrs.canvasbordercolor,
                            palette.canvasbordercolor), pluck(chartAttrs.canvasborderalpha,
                            palette.canvasborderalpha)),
                    borderWidth: chartBorderThickness,
                    borderDashStyle: pluckNumber(chartAttrs.canvasborderdashed, 0) ?
                        getDashStyle(pluckNumber(chartAttrs.canvasborderdashlen, 4),
                            pluckNumber(chartAttrs.canvasborderdashgap, 2), chartBorderThickness) : undefined,
                    backgroundColor: colorize({
                        color: canBGColor,
                        alpha: canBGAlpha,
                        angle: pluck(chartAttrs.bgangle, chartAttrs.canvasbgangle,
                                palette.canvasbgangle),
                        ratio: pluck(chartAttrs.bgratio, chartAttrs.canvasbgratio,
                                palette.canvasbgratio)
                    }),

                    // canvas border and background attributes are set by default
                    // to be invisible
                    plotBorderColor: '#ffffff',
                    plotBorderWidth: 0,
                    plotBackgroundColor: colorize({
                        color: '#ffffff',
                        alpha: 0
                    }),

                    // bg image and swf options
                    bgSWF: pluck(chartAttrs.bgimage, chartAttrs.bgswf),
                    bgSWFAlpha: pluckNumber(chartAttrs.bgimagealpha,
                            chartAttrs.bgswfalpha, 100),
                    bgImageScale: pluckNumber(chartAttrs.bgimagescale, 100),
                    bgImageDisplayMode: pluck(chartAttrs.bgimagedisplaymode, NONE)
                            .toLowerCase(),

                    // foreground logo parameters (logoUrl)
                    logoURL: getValidValue(chartAttrs.logourl),
                    logoPosition: pluck(chartAttrs.logoposition, 'tl').toLowerCase(),
                    logoAlpha: pluckNumber(chartAttrs.logoalpha, 100),
                    logoLink: getValidValue(chartAttrs.logolink),
                    logoScale: pluckNumber(chartAttrs.logoscale, 100),
                    logoLeftMargin: pluckNumber(chartAttrs.logoleftmargin, 0),
                    logoTopMargin: pluckNumber(chartAttrs.logotopmargin, 0),

                    //toolbar button parameters
                    toolbar : (function () {
                        var toolbar = {button: {}},
                            button = toolbar.button,
                            bSymbolPadding,
                            bPosition,
                            bHAlign,
                            bVAlign,
                            vDirection,
                            hDirection;

                        button.scale = pluckNumber(chartAttrs.toolbarbuttonscale, 1.15);
                        button.width = pluckNumber(chartAttrs.toolbarbuttonwidth, 15);
                        button.height = pluckNumber(chartAttrs.toolbarbuttonheight, 15);
                        button.radius = pluckNumber(chartAttrs.toolbarbuttonradius, 2);
                        button.spacing = pluckNumber(chartAttrs.toolbarbuttonspacing, 5);

                        button.fill = convertColor(pluck(chartAttrs.toolbarbuttoncolor, 'ffffff'));
                        button.labelFill = convertColor(pluck(chartAttrs.toolbarlabelcolor, 'cccccc'));
                        button.symbolFill = convertColor(pluck(chartAttrs.toolbarsymbolcolor, 'ffffff'));
                        button.hoverFill = convertColor(pluck(chartAttrs.toolbarbuttonhovercolor, 'ffffff'));
                        button.stroke = convertColor(pluck(chartAttrs.toolbarbuttonbordercolor, 'bbbbbb'));
                        button.symbolStroke = convertColor(pluck(chartAttrs.toolbarsymbolbordercolor, '9a9a9a'));

                        button.strokeWidth = pluckNumber(chartAttrs.toolbarbuttonborderthickness, 1);
                        button.symbolStrokeWidth = pluckNumber(chartAttrs.toolbarsymbolborderthickness, 1);
                        bSymbolPadding = button.symbolPadding = pluckNumber(chartAttrs.toolbarsymbolpadding, 5);
                        button.symbolHPadding = pluckNumber(chartAttrs.toolbarsymbolhpadding, bSymbolPadding);
                        button.symbolVPadding = pluckNumber(chartAttrs.toolbarsymbolvpadding, bSymbolPadding);

                        bPosition = toolbar.position = pluck(chartAttrs.toolbarposition, 'tr').toLowerCase();
                        switch(bPosition) {
                            case 'tr':
                            case 'tl':
                            case 'br':
                            case 'bl':
                                break;
                            default:
                                bPosition = 'tr';
                        }
                        bHAlign = toolbar.hAlign =
                            (BLANK + chartAttrs.toolbarhalign).toLowerCase() === 'left' ? 'l': bPosition.charAt(1);
                        bVAlign = toolbar.vAlign =
                            (BLANK + chartAttrs.toolbarvalign).toLowerCase() === 'bottom' ? 'b' : bPosition.charAt(0);
                        hDirection = toolbar.hDirection =
                            pluckNumber(chartAttrs.toolbarhdirection, (bHAlign === 'r' ? -1 : 1));
                        vDirection = toolbar.vDirection =
                            pluckNumber(chartAttrs.toolbarvdirection, (bVAlign === 'b' ? -1 : 1));
                        toolbar.vMargin = pluckNumber(chartAttrs.toolbarvmargin, 6);
                        toolbar.hMargin = pluckNumber(chartAttrs.toolbarhmargin, 10);
                        toolbar.x = pluckNumber(chartAttrs.toolbarx, bHAlign === 'l' ? 0: width);
                        toolbar.y = pluckNumber(chartAttrs.toolbary, bVAlign === 't' ? 0: height);

                        return toolbar;

                    } ())
                },

                title: {
                    text: parseUnsafeString(chartAttrs.caption),
                    offsetX: Number(chartAttrs.captionxshift),
                    offsetY: Number(chartAttrs.captionyshift),
                    position: pluck(chartAttrs.captionposition,
                        (chartAttrs.captionxshift !== undefined || chartAttrs.captionyshift !== undefined) ?
                            'top left' : 'top'),
                    padding: pluckNumber(chartAttrs.captionpadding, 10),
                    style: {
                        fontFamily: pluck(chartAttrs.captionfontfamily, outCanFontFamily),
                        color: pluck(chartAttrs.captionfontcolor, outCanColor).
                            replace(/^#?([a-f0-9]+)/ig, '#$1'),
                        fontSize: pluckNumber(chartAttrs.captionfontsize, (fontSize + 3)) + PX,
                        fontWeight: pluckNumber(chartAttrs.captionfontbold) === 0 ? NORMAL : BOLD
                    }
                },

                subtitle: {
                    text: parseUnsafeString(chartAttrs.subcaption),
                    style: {
                        fontFamily:
                            pluck(chartAttrs.subcaptionfontfamily, chartAttrs.captionfontfamily, outCanFontFamily),
                        color: pluck(chartAttrs.subcaptionfontcolor, chartAttrs.captionfontcolor, outCanColor).
                            replace(/^#?([a-f0-9]+)/ig, '#$1'),
                        fontSize: (pluckNumber(chartAttrs.subcaptionfontsize,
                            (pluckNumber(mathMax(chartAttrs.captionfontsize - 3, 1), fontSize))) + PX),
                        fontWeight: pluckNumber(chartAttrs.subcaptionfontbold) === 0 ?
                            NORMAL : BOLD
                    }
                },

                // Annotations default style
                orphanStyles: {
                    defaultStyle: {
                        style: extend2({}, conf.inCanvasStyle)
                    }
                },

                // Tooltip related configurations
                tooltip: {
                    enabled: conf.showTooltip !== 0,

                    style: {
                        fontFamily: inCanFontFamily,
                        fontSize:  inCanFontSize,
                        lineHeight: inCanLineHeight,
                        color: inCancolor,
                        padding: (pluckNumber(chartAttrs.tooltippadding,
                            this.tooltippadding, 3) + PX),
                        backgroundColor: convertColor(pluck(defaultTooltipStyle.backgroundColor,
                            chartAttrs.tooltipbgcolor, palette.tooltipbgcolor),
                            pluck(chartAttrs.tooltipbgalpha, '100')),
                        borderColor: convertColor(pluck(defaultTooltipStyle.borderColor,
                            chartAttrs.tooltipbordercolor,
                            palette.tooltipbordercolor),
                            pluck(chartAttrs.tooltipborderalpha, '100')),
                        borderWidth: pluckNumber(chartAttrs.tooltipborderthickness,
                            roundEdgeNegative) + PX,
                        borderRadius: pluckNumber(chartAttrs.tooltipborderradius,
                                (roundEdgePositive + 1)) + PX
                    },

                    constrain: pluckNumber(chartAttrs.constraintooltip, 1),
                    shadow:
                    (pluckNumber(chartAttrs.showtooltipshadow, chartAttrs.showshadow, 1) ? {
                        enabled: true,
                        opacity: mathMax(
                            pluckNumber(chartAttrs.tooltipbgalpha, 100),
                            pluckNumber(chartAttrs.tooltipborderalpha, 100)
                        ) / 100
                    } : false)
                },

                legend: {
                    itemStyle: {
                        fontFamily: pluck(chartAttrs.legenditemfont, outCanFontFamily),
                        fontSize:  pluckNumber(chartAttrs.legenditemfontsize, outCanFontSize) + 'px',
                        color: hashify( pluck(chartAttrs.legenditemfontcolor, outCanColor)),
                        fontWeight: pluckNumber(chartAttrs.legenditemfontbold) ? 'bold' : 'normal'
                    },
                    itemHiddenStyle: {
                        fontFamily: outCanFontFamily,
                        fontSize:  outCanFontSizePx,
                        color: hashify(pluck(chartAttrs.legenditemhiddencolor, outCanColor))
                    },
                    itemHoverStyle: {
                        color: hashify(pluck(chartAttrs.legenditemhoverfontcolor, chartAttrs.legenditemfontcolor,
                            outCanColor))
                    },
                    enabled: pluckNumber(chartAttrs.showlegend, 1),
                    title: {
                        text: parseUnsafeString(chartAttrs.legendcaption),
                        style: {
                            fontFamily: pluck(chartAttrs.legendcaptionfont, outCanFontFamily),
                            fontSize:  pluckNumber(chartAttrs.legendcaptionfontsize, outCanFontSize) + 'px',
                            color: hashify(pluck(chartAttrs.legendcaptionfontcolor, outCanColor)),
                            fontWeight: pluckNumber(chartAttrs.legendcaptionfontbold, 1) ? 'bold' : 'normal'
                        },
                        align: TEXT_ANCHOR_MAP[pluck(chartAttrs.legendcaptionalignment)]
                    },
                    position: pluck(chartAttrs.legendposition,
                        pluckNumber(fc.colorrange && fc.colorrange.gradient, 0) === 0 ?
                            POSITION_RIGHT : POSITION_BOTTOM),
                    backgroundColor: pluck(chartAttrs.legendbgcolor, palette.bgcolor),
                    backgroundAlpha: pluck(chartAttrs.legendbgalpha, '100'),
                    borderColor: pluck(chartAttrs.legendbordercolor, palette.legendbordercolor),
                    borderThickness: pluck(chartAttrs.legendborderthickness, '1'),
                    borderAlpha: pluck(chartAttrs.legendborderalpha, '100'),
                    shadow: pluckNumber(chartAttrs.legendshadow, 1),
                    allowDrag: pluckNumber(chartAttrs.legendallowdrag, 0),
                    scroll: {
                        scrollBgColor: pluck(chartAttrs.legendscrollbgcolor, chartAttrs.scrollcolor, 'AAAAAA'),
                        scrollBtnColor: pluck(chartAttrs.legendscrollbtncolor, 'BBBBBB'),
                        scrollBarColor: pluck(chartAttrs.legendscrollbarcolor, 'CCCCCC')
                    },
                    reversed: pluckNumber(chartAttrs.reverselegend, 0),
                    interactive: pluckNumber(chartAttrs.interactivelegend, 0),
                    minColor: nullEntityColor,
                    lighting3d: lighting3d
                },

                // Default properties for markers
                markers: {
                    dataLabels: {
                        style: {
                            fontFamily: pluck(chartAttrs.markerfont, inCanFontFamily),
                            fontSize: pluckNumber(chartAttrs.markerfontsize, parseInt(inCanFontSize, 10)),
                            fontColor: pluck(chartAttrs.markerfontcolor, inCancolor)
                        }
                    },
                    showTooltip: pluckNumber(chartAttrs.showmarkertooltip, conf.showTooltip),
                    showLabels: pluckNumber(chartAttrs.showmarkerlabels,
                            chartAttrs.showlabels, 1),
                    showHoverEffect: pluckNumber(chartAttrs.showmarkerhovereffect, 1),
                    labelPadding: pluck(chartAttrs.markerlabelpadding, '5'),
                    labelWrapWidth: pluckNumber(chartAttrs.markerlabelwrapwidth, 0),
                    labelWrapHeight: pluckNumber(chartAttrs.markerlabelwrapheight, 0),
                    fillColor: pluck(chartAttrs.markerfillcolor, chartAttrs.markerbgcolor,
                            palette.markerfillcolor), // has a legacy attr
                    fillAlpha: pluck(chartAttrs.markerfillalpha, palette.markerfillalpha),
                    fillAngle: pluck(chartAttrs.markerfillangle, palette.markerfillangle),
                    fillRatio: pluck(chartAttrs.markerfillratio, palette.markerfillratio),
                    fillPattern: pluck(chartAttrs.markerfillpattern, palette.markerbgpattern),
                    hoverFillColor: chartAttrs.markerfillhovercolor,
                    hoverFillAlpha: chartAttrs.markerfillhoveralpha,
                    hoverFillRatio: chartAttrs.markerfillhoverratio,
                    hoverFillAngle: chartAttrs.markerfillhoverangle,
                    borderThickness: pluck(chartAttrs.markerborderthickness, 1),
                    borderColor: pluck(chartAttrs.markerbordercolor, palette.markerbordercolor),
                    borderAlpha: pluckNumber(chartAttrs.markerborderalpha, palette.markerborderalpha),
                    hoverBorderThickness: chartAttrs.markerborderhoverthickness,
                    hoverBorderColor: chartAttrs.markerborderhovercolor,
                    hoverBorderAlpha: chartAttrs.markerborderhoveralpha,
                    radius: pluckNumber((chartAttrs.markerradius && lib.trimString(chartAttrs.markerradius)), 7),
                    shapeId: pluck(chartAttrs.defaultmarkershape, SHAPE_CIRCLE),
                    labelSepChar: pluck(chartAttrs.labelsepchar, COMMASPACE),
                    tooltipSepChar: conf.tooltipSepChar,
                    autoScale: pluckNumber(chartAttrs.autoscalemarkers, 0),
                    tooltext: pluck(markerAttrs && markerAttrs.tooltext, chartAttrs.markertooltext),

                    /* Value related attributes */
                    dataEnabled: conf.useValuesForMarkers,
                    valueToRadius: pluckNumber(chartAttrs.markerradiusfromvalue, 1),
                    valueMarkerAlpha: pluck(chartAttrs.valuemarkeralpha, '75'),
                    hideNull: pluckNumber(chartAttrs.hidenullmarkers, 0),
                    nullRadius: pluckNumber(chartAttrs.nullmarkerradius, chartAttrs.markerradius, 7),
                    adjustViewPort: pluckNumber(chartAttrs.adjustviewportformarkers, 0),

                    startAngle: pluckNumber(chartAttrs.markerstartangle, 90),
                    maxRadius: pluckNumber(chartAttrs.maxmarkerradius, 0),
                    minRadius: pluckNumber(chartAttrs.minmarkerradius, 0),
                    applyAll: pluckNumber(chartAttrs.applyallmarkers, 0),
                    shadow: pluckNumber(chartAttrs.showmarkershadow,
                        chartAttrs.showshadow, 0)
                },

                // Default properties for connectors
                connectors: {
                    showHoverEffect: pluckNumber(chartAttrs.showconnectorhovereffect, 1),
                    thickness: pluckNumber(chartAttrs.connectorthickness,
                        chartAttrs.markerconnthickness, '2'),
                    color: pluck(chartAttrs.connectorcolor,
                        chartAttrs.markerconncolor, palette.markerbordercolor),
                    alpha: pluck(chartAttrs.connectoralpha,
                        chartAttrs.markerconnalpha, '100'),
                    hoverthickness: pluckNumber(chartAttrs.connectorhoverthickness,
                        chartAttrs.connectorthickness,
                        chartAttrs.markerconnthickness, '2'),
                    hovercolor: pluck(chartAttrs.connectorhovercolor,
                        chartAttrs.connectorcolor, chartAttrs.markerconncolor,
                        palette.markerbordercolor),
                    hoveralpha: pluck(chartAttrs.connectorhoveralpha,
                        chartAttrs.connectoralpha, chartAttrs.markerconnalpha, '100'),
                    dashed: pluckNumber(chartAttrs.connectordashed,
                        chartAttrs.markerconndashed, 0),
                    dashLen: pluckNumber(chartAttrs.connectordashlen,
                        chartAttrs.markerconndashlen, 3),
                    dashGap: pluckNumber(chartAttrs.connectordashgap,
                        chartAttrs.markerconndashgap, 2),
                    font: pluck(chartAttrs.connectorfont,
                        chartAttrs.markerconnfont, inCanFontFamily),
                    fontColor: pluck(chartAttrs.connectorfontcolor,
                        chartAttrs.markerconnfontcolor, inCancolor),
                    fontSize: pluckNumber(chartAttrs.connectorfontsize,
                        chartAttrs.markerconnfontsize,
                        parseInt(inCanFontSize, 10)),
                    showLabels: pluckNumber(chartAttrs.showconnectorlabels,
                        chartAttrs.showmarkerlabels, chartAttrs.showlabels, 1),
                    labelBgColor: pluck(chartAttrs.connectorlabelbgcolor,
                        chartAttrs.markerconnlabelbgcolor,
                        palette.plotfillcolor),
                    labelBorderColor: pluck(chartAttrs.connectorlabelbordercolor,
                        chartAttrs.markerconnlabelbordercolor,
                        palette.markerbordercolor),
                    shadow: pluckNumber(chartAttrs.showconnectorshadow,
                        chartAttrs.showmarkershadow,
                        chartAttrs.showshadow, 0),
                    showTooltip: pluckNumber(chartAttrs.showconnectortooltip,
                        chartAttrs.showmarkertooltip,
                        conf.showTooltip),
                    tooltext: pluck(markerAttrs && markerAttrs.connectortooltext, chartAttrs.connectortooltext),
                    hideOpen: pluckNumber(chartAttrs.hideopenconnectors, 1)
                },

                // Default properties for dataLabels
                entities: {
                    baseScaleFactor: iapi.baseScaleFactor,
                    // Set color and style for data-labels.
                    dataLabels: {
                        style: {
                            fontFamily: inCanFontFamily,
                            fontSize:  inCanFontSize,
                            lineHeight: inCanLineHeight,
                            // The color value is also copied back from style to the main
                            // 'dataLabels' object
                            color: (hc.plotOptions.series.dataLabels.color = inCancolor)
                        }
                    },
                    fillColor: entityFillColor,
                    fillAlpha: entityFillAlpha,
                    fillRatio: entityFillRatio,
                    fillAngle: entityFillAngle,
                    borderColor: entityBorderColor,
                    borderAlpha: pluck(chartAttrs.entityborderalpha, chartAttrs.borderalpha, iapi.borderAlpha, '100'),
                    borderThickness: pluckNumber(chartAttrs.showentityborder, chartAttrs.showborder, 1) ?
                        pluckNumber(chartAttrs.entityborderthickness,chartAttrs.borderthickness,  1) : 0,
                    scaleBorder: pluckNumber(chartAttrs.scaleentityborder, chartAttrs.scaleborder, 0),
                    hoverFillColor: pluck(chartAttrs.entityfillhovercolor, chartAttrs.hoverfillcolor,
                        chartAttrs.hovercolor, palette.plothoverfillcolor),
                    hoverFillAlpha: pluck(chartAttrs.entityfillhoveralpha, chartAttrs.hoverfillalpha,
                        chartAttrs.hoveralpha, palette.plothoverfillalpha),
                    hoverFillRatio: pluck(chartAttrs.entityfillhoverratio, chartAttrs.hoverfillratio,
                        chartAttrs.hoverratio, palette.plothoverfillratio),
                    hoverFillAngle: pluck(chartAttrs.entityfillhoverangle, chartAttrs.hoverfillangle,
                        chartAttrs.hoverangle, palette.plothoverfillangle),
                    hoverBorderThickness: pluck(chartAttrs.entityborderhoverthickness, chartAttrs.hoverborderthickness),
                    hoverBorderColor: pluck(chartAttrs.entityborderhovercolor, palette.plotbordercolor),
                    hoverBorderAlpha: pluck(chartAttrs.entityborderhoveralpha, palette.plotborderalpha),

                    nullEntityColor: nullEntityColor,
                    nullEntityAlpha: pluck(chartAttrs.nullentityfillalpha, chartAttrs.nullentityalpha, entityFillAlpha),
                    nullEntityRatio: pluck(chartAttrs.nullentityfillratio, chartAttrs.nullentityratio, entityFillRatio),
                    nullEntityAngle: pluck(chartAttrs.nullentityfillangle, chartAttrs.nullentityangle, entityFillAngle),

                    connectorColor: pluck(chartAttrs.labelconnectorcolor, chartAttrs.connectorcolor, inCancolor),
                    connectorAlpha: pluck(chartAttrs.labelconnectoralpha, chartAttrs.connectoralpha, '100'),
                    connectorThickness: pluckNumber(chartAttrs.labelconnectorthickness, chartAttrs.borderthickness, 1),

                    showHoverEffect: pluckNumber(chartAttrs.showentityhovereffect, chartAttrs.usehovercolor,
                        conf.showHoverEffect),
                    hoverOnNull: pluckNumber(chartAttrs.hoveronnull, chartAttrs.entityhoveronnull, 1),

                    labelPadding: pluckNumber(chartAttrs.labelpadding, 5),
                    showLabels: pluckNumber(chartAttrs.showlabels, 1),
                    labelsOnTop: pluckNumber(chartAttrs.entitylabelsontop, 1),
                    includeNameInLabels: pluckNumber(chartAttrs.includenameinlabels, 1),
                    includeValueInLabels: pluckNumber(chartAttrs.includevalueinlabels, 0),
                    useSNameInTooltip: pluckNumber(chartAttrs.usesnameintooltip, 0),
                    useShortName: pluckNumber(chartAttrs.usesnameinlabels, 1),
                    labelSepChar: pluck(chartAttrs.labelsepchar, COMMASPACE),
                    showTooltip: pluckNumber(chartAttrs.showentitytooltip,
                        conf.showTooltip),
                    tooltipSepChar: conf.tooltipSepChar,
                    tooltext: chartAttrs.entitytooltext,
                    hideNullEntities: pluckNumber(chartAttrs.hidenullentities, 0),
                    showHiddenEntityBorder: pluckNumber(chartAttrs.showhiddenentityborder, 1),
                    showNullEntityBorder: pluckNumber(chartAttrs.shownullentityborder, 1),
                    hiddenEntityColor: pluck(chartAttrs.hiddenentitycolor,
                        chartAttrs.hiddenentityfillcolor,
                        (chartAttrs.hiddenentityalpha ||
                            chartAttrs.hiddenentityfillalpha ?
                                nullEntityColor: 'ffffff')),
                    hiddenEntityAlpha: pluck(chartAttrs.hiddenentityalpha,
                        chartAttrs.hiddenentityfillalpha, 0.001),

                    // Plot shadow effect.
                    shadow: pluckNumber(chartAttrs.showshadow,
                                iapi.defaultPlotShadow, palette.shadow)
                },

                entitydef: {
                    useSNameAsId: pluckNumber(chartAttrs.usesnameasid, 0)
                }
            });

            hc.legend.title.style.lineHeight = setLineHeight(hc.legend.title.style);
            hc.legend.itemStyle.lineHeight = setLineHeight(hc.legend.itemStyle);
            hc.legend.itemHiddenStyle.lineHeight = setLineHeight(hc.legend.itemHiddenStyle);

            // Calculate the max and min radii of the markers. Needed while mapping
            // the value (if provided) of a marker to it's radius.
            obj = getMarkerRadiusLimits(width, height, chartAttrs.markermaxradius, chartAttrs.markerminradius);
            hc.markers.maxRadius = obj.max;
            hc.markers.minRadius = obj.min;

            // Tooltip color is separately processed so that the default
            // color is not overridden.
            if (chartAttrs.tooltipcolor) {
                hc.tooltip.style.color = getFirstColor(chartAttrs.tooltipcolor);
            }

            // Provide click events across objects when full chart is set as
            // clickable
            if (pluck(chartAttrs.clickurl) !== undefined) {
                chartOptions.link = chartAttrs.clickurl;
                chartOptions.style.cursor = 'pointer';
                isIE && (chartOptions.style._cursor = 'hand');
                //change the point Click event ot make similar as FC
                hc.plotOptions.series.point.events.click = function () {
                    chartOptions.events.click.call({
                        link : chartAttrs.clickurl
                    });
                };
            }

            // Set background swf param
            bgImageDisplayMode = chartOptions.bgImageDisplayMode;
            bgImageVAlign = getValidValue(chartAttrs.bgimagevalign, BLANK).toLowerCase();
            bgImageHAlign = getValidValue(chartAttrs.bgimagehalign, BLANK).toLowerCase();

            // When background mode is tile, fill and fit then default value of
            // vertical alignment and horizontal alignment will be middle and
            // middle
            if (bgImageDisplayMode == TILE || bgImageDisplayMode == FILL ||
                    bgImageDisplayMode == FIT) {
                if (bgImageVAlign != POSITION_TOP && bgImageVAlign !=
                        POSITION_MIDDLE && bgImageVAlign != POSITION_BOTTOM) {
                    bgImageVAlign = POSITION_MIDDLE;
                }
                if (bgImageHAlign != POSITION_LEFT && bgImageHAlign !=
                        POSITION_MIDDLE && bgImageHAlign != POSITION_RIGHT) {
                    bgImageHAlign = POSITION_MIDDLE;
                }
            }
            else {
                if (bgImageVAlign != POSITION_TOP && bgImageVAlign !=
                        POSITION_MIDDLE && bgImageVAlign != POSITION_BOTTOM) {
                    bgImageVAlign = POSITION_TOP;
                }
                if (bgImageHAlign != POSITION_LEFT && bgImageHAlign !=
                        POSITION_MIDDLE && bgImageHAlign != POSITION_RIGHT) {
                    bgImageHAlign = POSITION_LEFT;
                }
            }

            chartOptions.bgImageVAlign = bgImageVAlign;
            chartOptions.bgImageHAlign = bgImageHAlign;

            // Parse styles as overridden by users
            this.parseStyles(hc);

            // Update the line heights after performing recalculation based on
            // style.
            setLineHeight(hc.title.style);
            setLineHeight(hc.subtitle.style);
            setLineHeight(hc.tooltip.style);

            // Mark allowPointSelect as true so that tracker click works fine
            // on touch devices.
            hc.plotOptions.series.allowPointSelect = true;

            // Parse Export related configuration.
            this.parseExportOptions(hc);

            // Execute 'preSeriesAddition' hook.
            this.preSeriesAddition &&
                this.preSeriesAddition(hc, fc, width, height);

            // Create the data series first
            this.series && this.series(fc, hc, iapi.name, width, height);

            // Execute 'postSeriesAddition' hook.
            this.postSeriesAddition &&
                this.postSeriesAddition(hc, fc, width, height);

            // Execute space-manager after everything is computed.
            this.spaceManager(hc, fc, width, height);

            /*jslint devel:true */
            if (win.console && win.FC_DEV_ENVIRONMENT) {
                win.console.log(hc);
            }
            /*jslint devel:false */

            // Return the final visualization logic to be further processed or be
            // sent to the draw() function.
            return hc;
        },

        /*
         * The series function puts the user-provided data for the
         * entities and markers etc into the proper places in the HCObj so that
         * from where they can be accessed while drawing.
         */
        series: function (fc, hc) {
            /**
             *  Creating entries in the vlogic series array corresponding to
             *  color range as legend needs this structure in order to
             *  function.
             */
            var iapi = this,
            numberFormatter = iapi.numberFormatter,
            series = iapi.hcJSON.series,
            markerAlpha = hc.markers.valueMarkerAlpha,
            hasHoverColor = hc.markers.hasHoverColor,
            hasHoverAlpha = hc.markers.hasHoverAlpha,
            dataObj = iapi.dataObj,
            conf = hc[CONFIGKEY],
            colorRange = dataObj.colorrange,
            colorArr = colorRange && colorRange.color,
            legend = hc.legend,
            dataBySeries = {},
            getSeriesIndex = function (value) {

                var colorObj,
                    rangeMax,
                    rangeMin,
                    j = (colorRangeArr && colorRangeArr.length) || 0;


                while (j--) {
                    colorObj = colorRangeArr[j],
                    rangeMax = Number(colorObj.maxvalue),
                    rangeMin = pluckNumber(colorObj.minvalue, hc.colorRange.scaleMin);

                    if (value >= rangeMin && value <= rangeMax) {
                        return j;
                    }
                }

                return null;
            },
            seriesMethods = {
                legendClick: function () {
                    var chart;
                    if (chart = this.chart) {
                        (!this.legend) && (this.legend = this.plot.legend);
                        chart.legendClick(this, !this.visible);
                    }
                },
                getEventArgs: function () {
                    var chart;
                    if (chart = this.chart) {
                        (!this.legend) && (this.legend = this.plot.legend);
                        return chart.getEventArgs(this);
                    }
                },
                setVisible: function (vis) {
                    var series = this,
                    data = series.data,
                    legendItem = series.legendItem,
                    oldVisibility = series.visible,
                    entItem,
                    i;

                    // if called without an argument, toggle visibility
                    series.visible = vis = ((vis === undefined) ? !oldVisibility : vis);

                    if (legendItem) {
                        legend.colorizeItem && legend.colorizeItem(series, vis);
                    }

                    i = data && data.length;

                    while (i--) {
                        entItem = data[i].mapItem;
                        if (entItem) {
                            if (vis) {
                                entItem.show && entItem.show();
                            }
                            else {
                                entItem.hide && entItem.hide();
                            }
                        }
                    }
                }
            },
            dataMin = Infinity,
            dataMax = -Infinity,
            entities,
            item,
            color,
            colorObj,
            colorRangeObj,
            colorRangeArr,
            value,
            seriesIndex,
            j,
            i;

            function getMinMax (items) {
                i = (items && items.length) || 0;

                while (i--) {
                    item = items[i];
                    value = item.value;
                    item.cleanValue = numberFormatter.getCleanValue(value);
                    if (item.cleanValue !== null) {
                        item.formattedValue = numberFormatter.dataLabels(value);
                    }
                    else {
                        item.formattedValue = undefined;
                    }
                    item.origValue = value;

                    if (item.cleanValue !== null) {
                        dataMin = mathMin(item.cleanValue, dataMin);
                        dataMax = mathMax(item.cleanValue, dataMax);
                    }
                }
            }

            function setColorsFromRange (items, alpha, isMarkers) {
                i = (items && items.length) || 0;

                while (i--) {
                    item = items[i],
                    seriesIndex = getSeriesIndex(pluckNumber(item.value));
                    if (seriesIndex !== null) {
                        color = (legend.type === 'gradient') ? hc.colorRange.getColorObj(item.value).code :
                            colorArr && colorArr[seriesIndex] &&
                            pluck(colorArr[seriesIndex].color, colorArr[seriesIndex].code);

                        if (!dataBySeries[seriesIndex]) {
                            dataBySeries[seriesIndex] = [];
                        }

                        if (color) {
                            item.color = item.color ? item.color : color;

                            /** @todo: Code cleanup candidate */
                            if (alpha) {
                                item.alpha = item.alpha ? item.alpha : alpha;
                            }

                            if (isMarkers) {
                                if (!hasHoverAlpha && !item.fillhoveralpha) {
                                    item.fillhoveralpha = item.alpha;
                                }
                                if (!hasHoverColor && !item.fillhovercolor) {
                                    item.fillhovercolor = item.color;
                                }
                            }
                            dataBySeries[seriesIndex].push(item);
                        }
                    }
                }
            }

            getMinMax(dataObj.data || []);

            /* values_for_markers */
            if (conf.useValuesForMarkers) {
                getMinMax((dataObj.markers && dataObj.markers[MARKER_ITEM_KEY]) || []);
            }
            /* values_for_markers */

            conf._doNotShowLegend = true;

            legend.type = (dataObj.colorrange && dataObj.colorrange.gradient === '1') ? 'gradient' : 'point';

            (dataMin === Infinity) && (dataMin = undefined);
            (dataMax === -Infinity) && (dataMax = undefined);

            conf.dataMin = dataMin;
            conf.dataMax = dataMax;

            hc.colorRange = new lib.colorRange({
                colorRange: dataObj.colorrange,
                dataMin: dataMin,
                dataMax: dataMax,
                defaultColor: legend.minColor,
                numberFormatter: numberFormatter
            });

            colorRangeObj = hc.colorRange,
            colorRangeArr = colorRangeObj.colorArr,
            i = ((colorRangeArr && colorRangeArr.length) || 0);

            if (i > 0) {
                while (i--) {
                    colorObj = colorRangeArr[i];
                    if (conf._doNotShowLegend &&
                        (colorObj.label !== '' ||
                        colorObj.label !== undefined)) {

                        conf._doNotShowLegend = false;
                    }

                    series.push(extend2({
                        type: iapi.defaultSeriesType,
                        showInLegend: true,
                        data: [],
                        plot: {},
                        name: colorObj.label,
                        color: colorObj.code,
                        rangeMin: colorObj.minvalue,
                        rangeMax: colorObj.maxvalue,
                        visible: true
                    }, seriesMethods));
                }

                setColorsFromRange(dataObj.data || []);

                /* values_for_markers */
                if (conf.useValuesForMarkers) {
                    setColorsFromRange(
                        ((dataObj.markers && dataObj.markers[MARKER_ITEM_KEY]) || []), markerAlpha, true);
                }
                /* values_for_markers */


                series = series.reverse();

                for (j in dataBySeries) {
                    series[j] && (series[j].data = dataBySeries[j]);
                }

            }
            else {
                series.push({
                    type: iapi.defaultSeriesType,
                    data: (entities || [])
                });
            }

            conf._doNotShowLegend && (iapi.hcJSON.legend.enabled = false);
        },

        /*
         * This method to determine if the dimensions of the graphic (map) need to
         * be altered to accomodate markers within them.
         *
         * Only the x and y are used here as this calculation is primarily for the
         * properties that will be scaled up and down with the graphic (map).
         *
         * ~param {object} hc
         * ~param {object} fc
         *
         * ~return {object} The min and max co-ordinates of the markers,
         * excluding the space needed for the radius which will be accounted for later.
         */
        preliminaryScaling: function (hc, fc) {

            var markerArray = (fc.markers && fc.markers[MARKER_ITEM_KEY]) || [],
                i = (markerArray && markerArray.length) || 0,
                minX = Infinity,
                minY = Infinity,
                maxX = -Infinity,
                maxY = -Infinity,
                x,
                y,
                item;

            while (i--) {
                item = markerArray[i];

                x = Number(item.x);
                y = Number(item.y);

                minX = mathMin(minX, x);
                minY = mathMin(minY, y);
                maxX = mathMax(maxX, x);
                maxY = mathMax(maxY, y);
            }

            return {
                x: minX,
                y: minY,
                x1: maxX,
                y1: maxY
            };
        },

        /*
         * This method returns the scale factor and translate factors when a graphic
         * of provided dimensions has to be scaled to best fit into a view port of
         * provided dimensions.
         *
         * ~param {number} wg, width of the graphic
         * ~param {number} hg, height of the graphic
         * ~param {number} wv, width of the viewport
         * ~param {number} hv, height of the viewport
         *
         * ~returns {object}
         */
        getScalingParameters: function (wg, hg, wv, hv) {
            var iapi = this,
                aspR = wg / hg,
                widthScaleR = (wv / (wg * iapi.baseScaleFactor)),
                heightScaleR = (hv / (hg * iapi.baseScaleFactor)),
                translateX = 0,
                translateY = 0,
                scaleFactor,
                strokeWidth;

            if (widthScaleR > heightScaleR) {
                scaleFactor = heightScaleR;
                translateX += (wv - (hv * aspR)) / 2;
                strokeWidth = (200 / (hg * scaleFactor));
            }
            else {
                scaleFactor = widthScaleR;
                translateY += (hv - (wv / aspR)) / 2;
                strokeWidth = (200 / (wg * scaleFactor));
            }

            return {
                scaleFactor: scaleFactor,
                strokeWidth: strokeWidth,
                translateX: translateX,
                translateY: translateY
            };
        },

        /*
         * Assigns to markers radii normalized using that value of the marker. If
         * marker does not have a value then user provided radius or default radius
         * is assumed. The bounding box for each marker is then obtained using the
         * radius and total overflow on each side of the map canvas is returned in
         * an object.
         *
         * ~param {object} hc
         * ~param {object} fc
         * ~param {number} scaleFactor, the scaleFactor applied to the map
         * ~param {number} xOffset, if a markers co-ordinates are given in -ve
         * co-ordinates then an offset needs to be added to the marker position
         * to account for it.
         * ~param {number} yOffset
         *
         * ~return {object}
         */
        calculateMarkerBounds: function (hc, fc, scaleFactor, xOffset, yOffset) {

            var markerOptions = hc.markers,
                conf = hc[CONFIGKEY],
                dataMin = conf.dataMin,
                dataMax = conf.dataMax,
                minR = markerOptions.minRadius,
                maxR = markerOptions.maxRadius,
                hideNull = markerOptions.hideNull,
                nullRadius = markerOptions.nullRadius,
                v2r = markerOptions.valueToRadius,
                markerArray = (fc.markers && fc.markers[MARKER_ITEM_KEY]) || [],
                i = (markerArray && markerArray.length) || 0,
                minX = Infinity,
                minY = Infinity,
                maxX = -Infinity,
                maxY = -Infinity,
                x,
                y,
                r,
                item;

            while (i--) {
                item = markerArray[i];

                if (item.cleanValue !== null) {
                    if (v2r && item.radius === undefined) {
                        item.radius = minR + ((maxR - minR) * (item.cleanValue - dataMin) / (dataMax - dataMin));
                    }
                }
                else {
                    if (hideNull) {
                        item.__hideMarker = true;
                    }
                    else if (item.radius === undefined) {
                        item.radius = nullRadius;
                    }
                    continue;
                }

                r = Number(item.radius);
                x = (Number(item.x) + xOffset) * scaleFactor;
                y = (Number(item.y) + yOffset) * scaleFactor;

                // These values will be scaled along with the graphic
                minX = mathMin(minX, x - r);
                minY = mathMin(minY, y - r);
                maxX = mathMax(maxX, x + r);
                maxY = mathMax(maxY, y + r);
            }

            return {
                x: minX,
                y: minY,
                x1: maxX,
                y1: maxY
            };
        },

        /*
         *  Manages the space allocated to the various components of Maps like
         *  caption, subcation, legend and canvas.
         *
         *  Note: The caption and subcaption can also be positioned absolutely
         *  w.r.t to the canvas and that is handled here.
         */
        spaceManager: function (hc, fc, width, height) {
            var iapi = this,
                chartOptions = hc.chart,
                conf = hc[CONFIGKEY],

                // chart margins as present within chart options.
                plotLeft = chartOptions.spacingLeft,
                plotTop = chartOptions.spacingTop,
                plotRight = chartOptions.spacingRight,
                plotBottom = chartOptions.spacingBottom,

                // get base width and height as defined within map base.
                wg = iapi.baseWidth,
                hg = iapi.baseHeight,
                //legendBlock = new GradientLegend(),
                //legendBlockSpace = iapi.legendBlockSpace(),

                // width and height of the final viewport

                canvasWidth = width - (plotRight + plotLeft),
                canvasHeight = height - (plotBottom + plotTop),

                captionBlockSpace = conf._captionBlock = iapi.manageTitleSpace(hc, fc, canvasWidth, canvasHeight),
                captionBottomHeight = captionBlockSpace.isBottom ? captionBlockSpace.height : 0,
                legendSpace = conf._legendBlock =
                    iapi.placeLegendBlock(
                        hc,
                        fc,
                        canvasWidth,
                        (canvasHeight - captionBlockSpace.height),
                        captionBottomHeight
                    ),

                wv = canvasWidth - legendSpace.width,
                hv = canvasHeight - captionBlockSpace.height - legendSpace.height,

                // Properties that are dependent upon scale factor. They are
                // calculated later after determining the aspect ratio and
                // major scale axis.
                translateX = plotLeft,
                translateY = plotTop,
                extraMarkerSpace,
                yDifference = 0,
                xDifference = 0,
                initHv,
                initWv,
                scalingParams;


            if (conf.useValuesForMarkers) {
                if (conf.adjustViewPortForMarkers) {
                    // Calculate the overflow of the scaled properties (x, y)
                    extraMarkerSpace = iapi.preliminaryScaling(hc, fc);

                    if (extraMarkerSpace.x1 > wg) {
                        wg = extraMarkerSpace.x1;
                    }

                    if (extraMarkerSpace.x < 0) {
                        wg += (-extraMarkerSpace.x);
                        xDifference = (-extraMarkerSpace.x);
                    }

                    if (extraMarkerSpace.y1 > hg) {
                        hg = extraMarkerSpace.y1;
                    }

                    if (extraMarkerSpace.y < 0) {
                        hg += (-extraMarkerSpace.y);
                        yDifference = (-extraMarkerSpace.y);
                    }

                    // Get the scale factor and translate factors
                    scalingParams = iapi.getScalingParameters(wg, hg, wv, hv);

                    // Assign radii to the markers that have a value but no radius.
                    // Calculate the overflow of the radius (unscaled property).
                    extraMarkerSpace = iapi.calculateMarkerBounds(hc, fc,
                        scalingParams.scaleFactor * iapi.baseScaleFactor, xDifference, yDifference);

                    /**
                     * @todo: Check if the wv and hv become less than a certain limit.
                     * If they do reduce the radii of the markers.
                     */
                    initHv = hv;
                    initWv = wv;

                    if (extraMarkerSpace.x < 0) {
                        translateX += (-extraMarkerSpace.x);
                        wv += extraMarkerSpace.x;
                    }

                    if (extraMarkerSpace.y < 0) {
                        translateY += (-extraMarkerSpace.y);
                        hv += extraMarkerSpace.y;
                    }

                    if (extraMarkerSpace.x1 > initWv) {
                        wv -= (extraMarkerSpace.x1 - initWv);
                    }

                    if (extraMarkerSpace.y1 > initHv) {
                        hv -= (extraMarkerSpace.y1 - initHv);
                    }
                }
                else {
                    // Get the scale factor and translate factors
                    scalingParams = iapi.getScalingParameters(wg, hg, wv, hv);

                    // Assign radii to the markers that have a value but no radius.
                    // Calculate the overflow of the radius (unscaled property).
                    iapi.calculateMarkerBounds(hc, fc,
                        scalingParams.scaleFactor * iapi.baseScaleFactor, xDifference, yDifference);
                }

                // Recalculate the scale factor after accounting for radii.
                scalingParams = iapi.getScalingParameters(wg, hg, wv, hv);
                translateX += (xDifference * scalingParams.scaleFactor * iapi.baseScaleFactor);
                translateY += (yDifference * scalingParams.scaleFactor * iapi.baseScaleFactor);
            }
            else {
                scalingParams = iapi.getScalingParameters(wg, hg, wv, hv);
            }

            if (!(/bottom/i.test(captionBlockSpace.position))) {
                translateY += captionBlockSpace.height;
            }

            // Store the scale factor and other scaled attributes within iapi.
            iapi.scaleFactor = scalingParams.scaleFactor;
            iapi.strokeWidth = scalingParams.strokeWidth;
            iapi.translateX = scalingParams.translateX + translateX;
            iapi.translateY = scalingParams.translateY + translateY;
        },

        placeGLegendBlockRight: lib.placeGLegendBlockRight,
        placeGLegendBlockBottom: lib.placeGLegendBlockBottom,

        placeLegendBlock: function (hc, fc, width, height, captionAtBottom) {
            var legend = hc.legend,
                conf = hc[CONFIGKEY],
                availableWidth,
                position = legend.position.toLowerCase(),
                fcChart = fc.chart,
                retObj = {position: position};

            if (fcChart.showlegend === '0' || conf._doNotShowLegend) {
                retObj.height = 0;
                retObj.width = 0;

                return retObj;
            }

            if (position === POSITION_BOTTOM) {
                availableWidth = width;
                if (legend.type === 'gradient') {
                    //configureGradientLegendOptions(hc, fc, false, false, availableWidth);
                    retObj.height = this.placeGLegendBlockBottom(hc, fc, availableWidth, height);
                }
                else {
                    //configureLegendOptions(hc, fcChart, false, false, availableWidth);
                    retObj.height = this.placeLegendBlockBottom(hc, fc, availableWidth, height);
                }
                retObj.width = 0;

                if (captionAtBottom) {
                    legend.y = -(captionAtBottom);
                }
            }
            else {
                availableWidth = width / 2;
                if (legend.type === 'gradient') {
                    //configureGradientLegendOptions(hc, fc, false, false, availableWidth);
                    retObj.width = this.placeGLegendBlockRight(hc, fc, availableWidth, height);
                }
                else {
                    //configureLegendOptions(hc, fcChart, false, false, availableWidth);
                    retObj.width = this.placeLegendBlockRight(hc, fc, availableWidth, height);
                }
                retObj.height = 0;
            }

            return retObj;
        },

        manageTitleSpace: function (hcObj, fc, width, height) {
            var iapi = this,
                hc = iapi.hcJSON,
                captionObj = hc.title,
                chart = hc.chart,
                subcapObj = hc.subtitle,
                smartLabel = iapi.smartLabel,
                availabelHeight = (height / 2), // handling this inside the function here.
                availabelWidth = width,
                totalHeight = 0,
                position = captionObj.position.toLowerCase(),
                padding = captionObj.padding,
                absoluteCaption = false,
                userXOffset = captionObj.offsetX,
                userYOffset = captionObj.offsetY,
                captionHeight = 0,
                retObj = {},
                text,
                yOffset,
                smartTextObj;

            if (captionObj.text === '' && subcapObj.text === '') {
                return {
                    height: 0,
                    position: position
                };
            }

            // 1. Check if the caption is being positioned absolutely. If it is then
            // we should allocate any space for the caption. Also, if the caption &
            // subcaption have not been provided then also we need not allocate space
            // for it.
            if (!isNaN(userXOffset) || !isNaN(userYOffset)) {
                absoluteCaption = true;
                userXOffset = isNaN(userXOffset) ? 0 : userXOffset;
                userYOffset = isNaN(userYOffset) ? 0 : userYOffset;

            }

            // 1. Calculate the width and height being occupied by the caption.
            text = captionObj.text;
            if (text !== '') {
                smartLabel.setStyle(captionObj.style);
                smartTextObj = smartLabel.getOriSize(text);

                if (smartTextObj.width > availabelWidth ||
                    smartTextObj.height > availabelHeight) {

                    smartTextObj = smartLabel.getSmartText(text,
                    availabelWidth, availabelHeight);

                    captionObj.text = smartTextObj.text;
                    smartTextObj.tooltext && (captionObj.originalText = smartTextObj.tooltext);
                }
                captionObj.height = captionHeight = smartTextObj.height;
                totalHeight += captionHeight;
            }

            availabelHeight -= totalHeight;
            text = subcapObj.text;
            if (text !== '') {
                smartLabel.setStyle(subcapObj.style);
                smartTextObj = smartLabel.getOriSize(text);

                if ((smartTextObj.width > availabelWidth) ||
                    (smartTextObj.height > availabelHeight)) {

                    smartTextObj = smartLabel.getSmartText(text,
                        availabelWidth, availabelHeight);

                    subcapObj.text = smartTextObj.text;
                    smartTextObj.tooltext && (subcapObj.originalText = smartTextObj.tooltext);
                }

                totalHeight += (subcapObj.height = smartTextObj.height);
            }

            if (totalHeight + padding > availabelHeight) {
                totalHeight = availabelHeight;
            }
            else {
                totalHeight += padding;
            }

            if (position.match(/left/)) {
                subcapObj.align = captionObj.align = POSITION_START;
                subcapObj.x = captionObj.x = chart.marginLeft;
            }
            else if (position.match(/right/)) {
                subcapObj.align = captionObj.align = POSITION_END;
                subcapObj.x = captionObj.x = width;
            }
            else {
                subcapObj.align = captionObj.align = POSITION_MIDDLE;
                subcapObj.x = captionObj.x = (width / 2) ;
            }

            if (/bottom/.test(position)) {
                yOffset = (height - totalHeight) + chart.marginTop + padding;

                captionObj.y = yOffset;
                subcapObj.y = yOffset + captionHeight;

                if (!absoluteCaption) {
                    chart.marginBottom += totalHeight;
                    retObj.isBottom = true;
                }
                else {
                    captionObj.y += userYOffset;
                    subcapObj.y += userYOffset;

                    captionObj.x += userXOffset;
                    subcapObj.x += userXOffset;
                }
            }
            else {
                if (absoluteCaption) {
                    captionObj.y += userYOffset;
                    subcapObj.y += userYOffset;

                    captionObj.x += userXOffset;
                    subcapObj.x += userXOffset;
                }
                else {
                    chart.marginTop += totalHeight;
                }
            }

            retObj.height = absoluteCaption ? 0 : totalHeight;
            retObj.position = position;

            return retObj;
        },

        getFirstId: function () {
            return this.firstEntity;
        },

        getEntityPaths: function (copy) {
            var returnObj = {},
                ents = this.entities,
                id;

            if (copy) {
                for (id in ents) {
                    returnObj[id] = ents[id];
                }
                return returnObj;
            }
            else {
                return ents;
            }
        },

        redefineEntities: function (entityDef, options) {

            var api = this,
                entities = api.entities,
                redefinedEntities = {},
                processedIds = {},
                entityCount = 0,
                defObj,
                oldId,
                sName,
                lName,
                entityObj,
                newObj,
                newId,
                item,
                i,
                id;

            i = entityDef.length;

            while (i--) {
                defObj = entityDef[i],
                oldId = defObj.internalid,
                newId = (defObj.newid ? defObj.newid : oldId),
                sName = defObj.sname,
                lName = defObj.lname,
                entityObj = entities[oldId];

                /**
                 * Handling the exception when the entity ids in the map js have an
                 * extra space (leading or trailing)
                 */
                oldId = lib.trimString(oldId);
                newId = lib.trimString(newId);

                if (entityObj) {

                    redefinedEntities[newId] = newObj = {origId: oldId};

                    // processedIds is needed to keep track of all the entities
                    // that have been redefined using the entitiydef block.
                    processedIds[oldId] = true;

                    // not using extend2 as it involves a deep copy of the objects.
                    for (item in entityObj) {
                        newObj[item] = entityObj[item];
                    }

                    newObj.shortLabel = sName ? sName : entityObj.shortLabel;
                    newObj.label = lName ? lName : entityObj.label;
                }
            }

            api.entities = {};

            for (id in redefinedEntities) {
                redefinedEntities[id].origId = id;
                api.entities[id.toLowerCase()] = redefinedEntities[id];
                entityCount += 1;
            }

            for (id in entities) {

                newObj = entities[id];
                /**
                 * Handling the exception when the entity ids in the map js have an
                 * extra space (leading or trailing)
                 */
                id = lib.trimString(id);

                if (!processedIds[id]) {
                    if (options.useSNameAsId) {
                        api.entities[newObj.shortLabel.toLowerCase()] = entityObj = {};
                        entityObj.origId = newObj.shortLabel;
                    }
                    else {
                        api.entities[id.toLowerCase()] = entityObj = {};
                        entityObj.origId = id;
                    }

                    for (item in newObj) {
                        entityObj[item] = newObj[item];
                    }

                    entityCount += 1;
                }
            }

            // Entity count introduced to enable the batch rendering of entities.
            api.entityCount = entityCount;
        },

        colorPaletteMap: {
            basefontcolor: 'foregroundcolor',
            bordercolor: 'foregrounddarkcolor',
            borderalpha: 'foregrounddarkalpha',
            bgcolor: 'backgroundlightcolor',
            bgalpha: 'backgroundlightalpha',
            bgangle: 'backgroundlightangle',
            bgratio: 'backgroundlightratio',
            canvasbordercolor: 'foregrounddarkcolor',
            canvasborderalpha: 'foregrounddarkalpha',
            canvasbgcolor: 'backgroundlightcolor',
            canvasbgalpha: 'backgroundlightalpha',
            canvasbgangle: 'backgroundlightangle',
            canvasbgratio: 'backgroundlightratio',
            tooltipbordercolor: 'foregrounddarkcolor',
            tooltipborderalpha: 'foregrounddarkalpha',
            tooltipbgcolor: 'backgroundlightcolor',
            tooltipbgalpha: 'backgroundlightalpha',
            tooltipfontcolor: 'foregroundcolor',
            legendbordercolor: 'foregrounddarkcolor',
            legendborderalpha: 'foregrounddarkalpha',
            markerbordercolor: 'foregroundlightcolor',
            markerborderalpha: 'foregroundlightalpha',
            markerfillcolor: 'backgrounddarkcolor',
            markerfillalpha: 'backgrounddarkalpha',
            markerfillangle: 'backgrounddarkangle',
            markerfillratio: 'backgrounddarkratio',
            plotfillcolor: 'backgroundcolor',
            plotfillalpha: 'backgroundalpha',
            plotfillangle: 'backgroundangle',
            plotfillratio: 'backgroundratio',
            plothoverfillcolor: 'backgrounddarkcolor',
            plothoverfillalpha: 'backgrounddarkalpha',
            plothoverfillangle: 'backgrounddarkangle',
            plothoverfillratio: 'backgrounddarkratio',
            plotbordercolor: 'foregroundcolor',
            plotborderalpha: 'foregroundalpha',
            shadow: 'shadow'
        },

        eiMethods: {
            getMapName: function () {
                var vars = this.jsVars,
                    iapi = vars.hcObj.logic;

                return iapi.name;
            },

            getEntityList: function () {
                var vars = this.jsVars,
                    hcObj = vars.hcObj,
                    entities = hcObj.entities && hcObj.entities.items,
                    options,
                    serial = [],
                    entityId,
                    entity;

                for (entityId in entities) {
                    entity = entities[entityId];
                    options = entity.eJSON;
                    serial.push({
                        id: entity.id,
                        originalId: (entity.originalId || entity.id),
                        label: options.label,
                        shortlabel: options.shortLabel,
                        value: entity.value,
                        formattedValue: entity.formattedValue,
                        toolText: entity.toolText
                    });
                }
                // cleanup
                entity = null;
                entities = null;

                return serial;
            },

            getDataAsCSV: function () {

                var vars = this.jsVars,
                    entities = vars.hcObj && vars.hcObj.entities && vars.hcObj.entities.items,
                    csv = '"Id","Short Name","Long Name","Value","Formatted Value"',
                    entityId,
                    entity,
                    options,
                    value;

                for (entityId in entities) {
                    entity = entities[entityId];
                    options = entity.eJSON;
                    value = entity.value;
                    // create csv
                    csv += CRLFQUOTE + entity.id + QUOTECOMMAQUOTE +
                            options.shortLabel + QUOTECOMMAQUOTE +
                            options.label + QUOTECOMMAQUOTE +
                            (value === undefined ? BLANK : value) +
                                QUOTECOMMAQUOTE +
                            entity.formattedValue + QUOTE;
                }

                // cleanup
                entity = null;
                options = null;
                entities = null;
                return csv;
            },

            getMapAttribute: function () {
                var chartObj = this.jsVars.fcObj;

                global.raiseWarning(this, '12061210581', 'run', 'JavaScriptRenderer~getMapAttribute()',
                    'Use of deprecated "getMapAttribute()". Replace with "getChartAttribute()".');
                return chartObj.getChartAttribute.apply(chartObj, arguments);
            },

            exportMap: function () {
                var chartObj = this.jsVars.fcObj;

                global.raiseWarning(this, '12061210581', 'run', 'JavaScriptRenderer~exportMap()',
                    'Use of deprecated "exportMap()". Replace with "exportChart()".');
                return chartObj.exportChart &&
                    chartObj.exportChart.apply(chartObj, arguments);
            },

            addMarker: function (options) {
                var mapRenderer = this.jsVars.hcObj,
                    markers = mapRenderer.markers;

                if (!markers.addMarkerItem(options)) {
                    global.raiseWarning(this, '1309264086', 'run', 'MapsRenderer~addMarker()',
                        'Failed to add marker. Check the options and try again.');
                }
            },

            updateMarker: function (id, options) {
                var mapRenderer = this.jsVars.hcObj,
                    markers = mapRenderer.markers,
                    annotations = mapRenderer.mapAnnotations,
                    marker,
                    origOptions,
                    annotOptions;

                if (id) {
                    id = (id + BLANK).toLowerCase();
                    marker = markers.items[id];
                    if (marker) {
                        origOptions = marker.options;
                        // Add the marker options passed to the original options to persist in case of multiple updates.
                        extend2(origOptions, options);

                        // Get the annotation options from marker options.
                        annotOptions = marker.draw().markerShape;

                        // Update annotations
                        annotations.update(id, annotOptions);
                    }
                }
            },

            removeMarker: function (id) {
                var mapRenderer = this.jsVars.hcObj,
                    markers = mapRenderer.markers,
                    marker;

                if (id) {
                    id = (id + BLANK).toLowerCase();
                    marker = markers.items[id];

                    if (marker) {
                        marker.destroy();
                    }

                    delete markers.items[id];
                }
            }
        }

    }, chartAPI.linebase);


    // MAPS RENDERER
    mapRenderer = renderer('renderer.maps', {

        drawGraph: function () {

            var inst = this,
            paper = inst.paper,
            layers = inst.layers,
            sFactor,
            startX,
            startY,
            strokeWidth;

            // In case the dataSource is a url, the renderer will initially be
            // instantiated without the entities' information in the options. That
            // case needs to be ignored.
            if (inst.options.nativeMessage) {
                return;
            }

            if (!layers.dataset) {
                layers.dataset = paper.group('dataset').insertAfter(layers.background),
                layers.tracker = paper.group('hot').insertAfter(layers.dataset);
            }

            if (!inst.shadowLayer) {
                inst.shadowLayer = layers.shadow = paper.group('shadow').insertBefore(layers.dataset);
            }

            inst.strokeWidth = strokeWidth = inst.logic.strokeWidth;
            sFactor = inst.logic.scaleFactor;
            inst.translateX = startX = inst.logic.translateX;
            inst.translateY = startY = inst.logic.translateY;

            inst.sFactor = sFactor * inst.logic.baseScaleFactor;
            inst.transformStr = ['t', startX, ',', startY, 's', sFactor, ',', sFactor, ',0,0'].join('');

            inst.options.tooltip && (inst.options.tooltip.enabled !== false) &&
                paper.tooltip(inst.options.tooltip.style, inst.options.tooltip.shadow, inst.options.tooltip.constrain);

            inst.mapAnnotations = new lib.Annotations();

            inst.mapAnnotations.reset(null, {
                id: GEO,
                showbelow: 0,
                autoscale: 0,
                grpxshift: (inst.translateX ? inst.translateX : 0),
                grpyshift: (inst.translateY ? inst.translateY : 0),
                xscale: (inst.sFactor ? inst.sFactor : 1) * 100,
                yscale: (inst.sFactor ? inst.sFactor : 1) * 100,
                options: {useTracker: true}
            });

            inst.processEntityDefs();
            inst.drawEntities();

            if (!isIE || hasSVG) {
                layers.dataset.attr({
                    transform: inst.transformStr
                });

                layers.shadow.attr({
                    transform: inst.transformStr
                });
            }
            inst.drawMarkers();
        },

        /*
         * Called by the Legend (gradient=1), when the user changes the either of
         * its pointers.
         */
        setScaleRange: function (start, end) {
            var renderer = this,
            options = renderer.options,
            series = options.series,
            i = series.length,
            data,
            j,
            seriesOptions,
            value,
            entItem;

            while (i--) {
                seriesOptions = series[i];
                data = seriesOptions.data;
                j = data && data.length;

                if (!j) {
                    continue;
                }

                if (seriesOptions.rangeMin >= start && seriesOptions.rangeMax <= end) {
                    seriesOptions.setVisible(true);
                }
                else if (seriesOptions.rangeMax < start || seriesOptions.rangeMin > end) {
                    seriesOptions.setVisible(false);
                }
                else {
                    while (j--) {
                        entItem = data[j].mapItem;
                        value = (entItem && entItem.value);
                        if (!isNaN(value) && value !== '') {
                            if (value >= start && value <= end) {
                                entItem.show();
                            }
                            else {
                                entItem.hide();
                            }
                        }
                    }
                }
            }
        },

        processEntityDefs: function () {

            var rapi = this,
                options = rapi.options,
                entityDefOpts = options.entitydef,
                mapApi = rapi.logic,
                data = mapApi.dataObj,
                series = rapi.options.series,
                i = (series && series.length),
                entityDefs = data.entitydef || [];

            mapApi.redefineEntities(entityDefs, entityDefOpts);

            // Adding the instance of chart in the series for legendClick to work.
            while (i--) {
                series[i].chart = rapi;
            }
        },

        drawEntities: function () {
            var rapi = this,
                data = rapi.logic && rapi.logic.dataObj && rapi.logic.dataObj.data,
                group = rapi.layers.dataset,
                mapApi = rapi.logic;

            rapi.entities = new Entities(data, rapi, mapApi, group);
        },

        drawMarkers: function () {

            var inst = this,
                markerBlock = (inst.logic && inst.logic.dataObj &&
                    inst.logic.dataObj.markers) || null;

            if (markerBlock) {
                inst.markers = new Markers (markerBlock, inst, inst.group);
            }

            /** @todo: raise an event instead that Entities object would listen to */
            if (!inst.options.entities.labelsOnTop) {
                inst.entities.drawLabels();
            }
        },

        checkComplete: function () {
            var rapi = this,
                logic = rapi.logic,
                chartObj = logic.chartInstance;

            if (rapi.entities && rapi.entities.isReady()) {
                rapi.mapAnnotations.draw(rapi);
                logic.hasRendered = true;
                global.raiseEvent('internal.mapdrawingcomplete', {
                    renderer: rapi
                }, chartObj);
            }
        }

    }, renderer['renderer.root']);

}, [3, 2, 0, 'release']]);



