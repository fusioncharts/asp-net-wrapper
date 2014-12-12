using System;
using System.Collections;
using System.Configuration;
using System.Data;

using System.Web;
using System.Web.Security;
using System.Web.UI;
using System.Web.UI.HtmlControls;
using System.Web.UI.WebControls;
using System.Web.UI.WebControls.WebParts;

using FusionCharts.Charts;

public partial class BasicExample_BasicChart : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        // This page demonstrates the ease of generating charts using FusionCharts.
        // For this chart, we've used a pre-defined Data.xml (contained in /Data/ folder)
        // Ideally, you would NOT use a physical data file. Instead you'll have 
        // your own ASP.NET scripts virtually relay the XML data document. 
        // FusionCharts supports various data format, please comment the code for 
        // current data format (Chart.DataFormat.xmlurl) and uncomment the required format to view respective examples. 
        // For a head-start, we've kept this example very simple.

        // Create the chart - Column 3D Chart with data from Data/Data.xml
        Chart sales = new Chart();

        // Setting chart id
        sales.SetChartParameter(Chart.ChartParameter.chartId, "myChart");

        // Setting chart type to Column 3D chart
        sales.SetChartParameter(Chart.ChartParameter.chartType, "column3d");

        // Setting chart width to 500px
        sales.SetChartParameter(Chart.ChartParameter.chartWidth, "600");

        // Setting chart height to 400px
        sales.SetChartParameter(Chart.ChartParameter.chartHeight, "350");

        // Setting chart data as XML URL
        sales.SetData("Data/Data.xml", Chart.DataFormat.xmlurl);

        // Setting chart data as XML String 
        // sales.SetData("<chart caption='Monthly' xaxisname='Month' yaxisname='Revenue' numberprefix='$' showvalues='1' animation='0'>     <set label='Jan' value='420000' />     <set label='Feb' value='910000' />     <set label='Mar' value='720000' />     <set label='Apr' value='550000' />     <set label='May' value='810000' />     <set label='Jun' value='510000' />     <set label='Jul' value='680000' />     <set label='Aug' value='620000' />     <set label='Sep' value='610000' />     <set label='Oct' value='490000' />     <set label='Nov' value='530000' />     <set label='Dec' value='330000' />     <trendlines>         <line startvalue='700000' istrendzone='1' valueonright='1' tooltext='AYAN' endvalue='900000' color='009933' displayvalue='Target' showontop='1' thickness='5' />     </trendlines>     <styles>         <definition>             <style name='CanvasAnim' type='animation' param='_xScale' start='0' duration='1' />         </definition>         <application>             <apply toobject='Canvas' styles='CanvasAnim' />         </application>     </styles> </chart>", Chart.DataFormat.xml);

        // Setting chart data as JSON String (Uncomment below line  
        //sales.SetData("{\"chart\":{\"caption\":\"Monthly\",\"xaxisname\":\"Month\",\"yaxisname\":\"Revenue\",\"numberprefix\":\"$\",\"showvalues\":\"1\",\"animation\":\"0\"},\"data\":[{\"label\":\"Jan\",\"value\":\"420000\"},{\"label\":\"Feb\",\"value\":\"910000\"},{\"label\":\"Mar\",\"value\":\"720000\"},{\"label\":\"Apr\",\"value\":\"550000\"},{\"label\":\"May\",\"value\":\"810000\"},{\"label\":\"Jun\",\"value\":\"510000\"},{\"label\":\"Jul\",\"value\":\"680000\"},{\"label\":\"Aug\",\"value\":\"620000\"},{\"label\":\"Sep\",\"value\":\"610000\"},{\"label\":\"Oct\",\"value\":\"490000\"},{\"label\":\"Nov\",\"value\":\"530000\"},{\"label\":\"Dec\",\"value\":\"330000\"}],\"trendlines\":[{\"line\":[{\"startvalue\":\"700000\",\"istrendzone\":\"1\",\"valueonright\":\"1\",\"tooltext\":\"AYAN\",\"endvalue\":\"900000\",\"color\":\"009933\",\"displayvalue\":\"Target\",\"showontop\":\"1\",\"thickness\":\"5\"}]}],\"styles\":{\"definition\":[{\"name\":\"CanvasAnim\",\"type\":\"animation\",\"param\":\"_xScale\",\"start\":\"0\",\"duration\":\"1\"}],\"application\":[{\"toobject\":\"Canvas\",\"styles\":\"CanvasAnim\"}]}}", Chart.DataFormat.json);

        // Setting chart data as JSON URL
        //sales.SetData("Data/Data.json", Chart.DataFormat.jsonurl);

        Literal1.Text = sales.Render();
    }
}
