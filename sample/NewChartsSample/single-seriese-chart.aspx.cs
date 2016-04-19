using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;
using FusionCharts.Charts;

public partial class NewChartsSample_single_seriese_chart : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        String jsonData;
        jsonData = "{      'chart': {        'caption': 'Harry\"s SuperMart - Top 5 Stores\" Revenue',        'subCaption': 'Last Quarter',        'numberPrefix': '$',        'rotatevalues': '0',        'plotToolText': '<div><b>$label</b><br/>Sales : <b>$$value</b></div>',        'theme': 'fint'      },      'data': [{        'label': 'Bakersfield Central',        'value': '880000'      }, {        'label': 'Garden Groove harbour',        'value': '730000'      }, {        'label': 'Los Angeles Topanga',        'value': '590000'      }, {        'label': 'Compton-Rancho Dom',        'value': '520000'      }, {        'label': 'Daly City Serramonte',        'value': '330000'      }]    }";
        // Initialize chart
        Chart chart = new Chart("column2d", "myChart", "600", "350", "json", jsonData);
        // Render the chart
        Literal1.Text = chart.Render();
    }
}