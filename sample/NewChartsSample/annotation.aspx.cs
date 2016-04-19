using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;
using FusionCharts.Charts;
public partial class NewChartsSample_annotation : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        String jsonData;
        jsonData = "{        'chart': {          'caption': 'Top 4 Chocolate Brands Sold',          'subCaption': 'Last Year',          'yAxisName': 'Sales (in USD)',          'yAxisMaxValue': '120000',          'showXAxisLine': '0',          'numberPrefix': '$',          'theme': 'fint',          'PlotfillAlpha': '0',          'placeValuesInside': '0',          'rotateValues': '0',          'valueFontColor': '#333333',          'showLabels': '0',          'chartBottomMargin': '20',          'plotToolText': '<div>Brand : <b>$label</b><br/>Total Revenue : <b>$$value</b></div>',        },        'annotations': {          'autoScale': '1',          'scaleImages': '1',          'origW': '400',          'origH': '300',          'groups': [{            'id': 'user-images',            'items': [{              'id': 'butterFinger-icon',              'type': 'image',              'url': 'http://static.fusioncharts.com/sampledata/images/butterFinger.png',              'x': '$dataset.0.set.0.CenterX - 28',              'y': '$dataset.0.set.0.STARTY',              'xScale': '50',              'toy': '$dataset.0.set.0.ENDY + 2',            }, {              'id': 'snickrs-user-icon',              'type': 'image',              'url': 'http://static.fusioncharts.com/sampledata/images/snickrs.png',              'x': '$dataset.0.set.1.CenterX - 25',              'y': '$dataset.0.set.1.STARTY',              'xScale': '50',              'toy': '$dataset.0.set.1.ENDY + 2',            }, {              'id': 'coffee_crisp-user-icon',              'type': 'image',              'url': 'http://static.fusioncharts.com/sampledata/images/coffee_crisp.png',              'x': '$dataset.0.set.2.CenterX - 25',              'y': '$dataset.0.set.2.STARTY',              'xScale': '50',              'toy': '$dataset.0.set.2.ENDY + 2',            }, {              'id': '100grand-user-icon',              'type': 'image',              'url': 'http://static.fusioncharts.com/sampledata/images/100grand.png',              'x': '$dataset.0.set.3.CenterX - 25',              'y': '$dataset.0.set.3.STARTY',              'xScale': '50',              'toy': '$dataset.0.set.3.ENDY + 2',            }]          }]        },        'data': [{          'label': 'Butterfinger',          'value': '92000'        }, {          'label': 'Snickers',          'value': '87000'        }, {          'label': 'Coffee Crisp',          'value': '83000'        }, {          'label': '100 Grand',          'value': '80000'        }]      }";
        // Initialize chart - Column 3D Chart with data from Data/Data.json
        Chart sales = new Chart("column2d", "myChart", "600", "350", "json", jsonData);
        // Render the chart
        Literal1.Text = sales.Render();
    }
}