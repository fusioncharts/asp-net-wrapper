using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using FusionCharts.Charts;

namespace SimpleWebMVC.Controllers
{
    [HandleError]
    public class HomeController : Controller
    {
        public ActionResult Index()
        {
            ViewData["Message"] = "Welcome to ASP.NET MVC!";

            // This page demonstrates the ease of generating charts using FusionCharts.
            // For this chart, we've used a pre-defined Data.xml (contained in /Data/ folder)
            // Ideally, you would NOT use a physical data file. Instead you'll have 
            // your own ASP.NET scripts virtually relay the JSON / XML data document.
            // For a head-start, we've kept this example very simple.

            // Initialize chart - Column 3D Chart with data from Data/Data.json
            Chart sales = new Chart("column3d", "myChart", "600", "350", "xmlurl", "../../Data/Data.xml");
            
            // Render the chart
            ViewData["Message"] = sales.Render();
            return View();
        }

        

        public ActionResult About()
        {
            return View();
        }
    }
}
