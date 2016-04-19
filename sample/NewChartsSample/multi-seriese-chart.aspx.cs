using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;
using FusionCharts.Charts;
public partial class NewChartsSample_multi_seriese_chart : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        String jsonData;
        jsonData = "{     'chart': {       'caption': 'Split of Sales by Product Category',       'subCaption': '5 top performing stores  - last month',       'captionPadding': '15',       'numberPrefix': '$',       'showvalues': '1',       'valueFontColor': '#ffffff',       'placevaluesInside': '1',       'usePlotGradientColor': '0',       'legendShadow': '0',       'showXAxisLine': '1',       'xAxisLineColor': '#999999',       'divlineColor': '#999999',       'divLineIsDashed': '1',       'showAlternateVGridColor': '0',       'alignCaptionWithCanvas': '0',       'legendPadding': '15',       'plotToolText': '<div><b>$label</b><br/>Product : <b>$seriesname</b><br/>Sales : <b>$$value</b></div>',       'theme': 'fint'     },     'categories': [{       'category': [{         'label': 'Garden Groove harbour'       }, {         'label': 'Bakersfield Central'       }, {         'label': 'Los Angeles Topanga'       }, {         'label': 'Compton-Rancho Dom'       }, {         'label': 'Daly City Serramonte'       }]     }],     'dataset': [{       'seriesname': 'Non-Food Products',       'data': [{         'value': '28800'       }, {         'value': '25400'       }, {         'value': '21800'       }, {         'value': '19500'       }, {         'value': '11500'       }]     }, {       'seriesname': 'Food Products',       'data': [{         'value': '17000'       }, {         'value': '19500'       }, {         'value': '12500'       }, {         'value': '14500'       }, {         'value': '17500'       }]     }]   }";
        // Initialize chart
        Chart chart = new Chart("msbar2d", "myChart", "600", "350", "json", jsonData);
        // Render the chart
        Literal1.Text = chart.Render();
    }
}