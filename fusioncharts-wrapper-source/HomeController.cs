using FusionchartLatest.Models;
using FusionCharts.Charts;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using System.Diagnostics;

namespace FusionchartLatest.Controllers
{
    public class HomeController : Controller
    {
        public IActionResult Index()
        {
           //PrintManagerHelper.EnablePrintManager(HttpContext);
            List<Chart> chartlist = new List<Chart>();
            Chart sales = new Chart();
            
            // Setting chart id
            sales.SetChartParameter(Chart.ChartParameter.chartId, "myChart");

            // Setting chart type to Column 3D chart
            sales.SetChartParameter(Chart.ChartParameter.chartType, "column3d");

            // Setting chart width to 600px
            sales.SetChartParameter(Chart.ChartParameter.chartWidth, "600");

            // Setting chart height to 350px
            sales.SetChartParameter(Chart.ChartParameter.chartHeight, "350");

            // Setting chart data as JSON String (Uncomment below line  
            sales.SetData("{\"chart\":{\"caption\":\"Monthly\",\"xaxisname\":\"Month\",\"yaxisname\":\"Revenue\",\"numberprefix\":\"$\",\"showvalues\":\"1\",\"animation\":\"0\"},\"data\":[{\"label\":\"Jan\",\"value\":\"420000\"},{\"label\":\"Feb\",\"value\":\"910000\"},{\"label\":\"Mar\",\"value\":\"720000\"},{\"label\":\"Apr\",\"value\":\"550000\"},{\"label\":\"May\",\"value\":\"810000\"},{\"label\":\"Jun\",\"value\":\"510000\"},{\"label\":\"Jul\",\"value\":\"680000\"},{\"label\":\"Aug\",\"value\":\"620000\"},{\"label\":\"Sep\",\"value\":\"610000\"},{\"label\":\"Oct\",\"value\":\"490000\"},{\"label\":\"Nov\",\"value\":\"530000\"},{\"label\":\"Dec\",\"value\":\"330000\"}],\"trendlines\":[{\"line\":[{\"startvalue\":\"700000\",\"istrendzone\":\"1\",\"valueonright\":\"1\",\"tooltext\":\"AYAN\",\"endvalue\":\"900000\",\"color\":\"009933\",\"displayvalue\":\"Target\",\"showontop\":\"1\",\"thickness\":\"5\"}]}],\"styles\":{\"definition\":[{\"name\":\"CanvasAnim\",\"type\":\"animation\",\"param\":\"_xScale\",\"start\":\"0\",\"duration\":\"1\"}],\"application\":[{\"toobject\":\"Canvas\",\"styles\":\"CanvasAnim\"}]}}", Chart.DataFormat.json);
            chartlist.Add(sales);
            return View(chartlist);

        }

        
    }
}
