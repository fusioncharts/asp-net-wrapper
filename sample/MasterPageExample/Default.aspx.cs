using System;
using System.Data;
using System.Configuration;
using System.Collections;
using System.Web;
using System.Web.Security;
using System.Web.UI;
using System.Web.UI.WebControls;
using System.Web.UI.WebControls.WebParts;
using System.Web.UI.HtmlControls;
using System.Text;
// Use FusionCharts.Charts name space
using FusionCharts.Charts;

/// <summary>
/// FusionCharts in Master Page
/// </summary>
public partial class _Default : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        //For a head start we have kept the example simple
        //You can use complex code to render chart taking data streaming from 
        //database etc.

        // Initialize chart - Radar Chart with the JSON string
        Chart sales = new Chart("candlestick", "myChart", "700", "350", "jsonurl", "../Data/MasterPageData.json");
        // Render the chart
        Literal1.Text = sales.Render();
    }    
}
