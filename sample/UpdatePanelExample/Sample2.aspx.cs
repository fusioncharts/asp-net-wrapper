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
using DataConnection;
using InfoSoftGlobal;
using FusionCharts.Charts;

/// <summary>
/// FusionCharts and ASP.NET.AJAX Update Panel #2
/// </summary>
public partial class nextSample : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        //This will execute first time the page loads and not on ajax post back calls
        if (!IsPostBack)
        {
            // Show a blank Column2D Chart at first
            showColumnChart();
        }
        else
        {   
            // Handle Ajax PostBack Call
            // store ASP.NET Ajax special HTTP request
            // __EVENTARGUMENT holds value passed by JS function -__doPostBack
            //The value can be like "drillDown$1"
            //We take $ as delimiter so we get drillDown as the function to call
            //and 1 as the factory id. It can vary depending on the pie slice clicked.
            
            String sEventArguments = Request["__EVENTARGUMENT"];
            if (sEventArguments != null)
            {
                //extract arguments passed to the HTTP Request  
                Int32 iDelimiter = sEventArguments.IndexOf('$');
                String sArgument = sEventArguments.Substring(iDelimiter + 1);
                // extract the name of the post back function 
                if (sEventArguments.StartsWith("drillDown"))
                {
                    // call the post back function passing the argument(s)
                    drillDown(sArgument);
                }
            }
        }
    }

    /// <summary>
    /// Show Pie Chart on first load
    /// </summary>
    public void showPieChart()
    {
        if (!IsPostBack)
        {
            // SQL Query for Factory wise Total Quantity
            string strSQL = "select a.FactoryId,a.FactoryName,sum(b.Quantity) as TotQ from Factory_Master a,Factory_Output b where a.FactoryId=b.FactoryID group by a.FactoryId,a.FactoryName";

            // Connect DataBase and create data reader
            DbConn oRs = new DbConn(strSQL);
            // create strXML for XML 
            StringBuilder strXML = new StringBuilder();
            // Add chart element
            strXML.AppendFormat("<chart slicingDistance='0' caption='Factory wise Production' subcaption='Total Production in Units' formatNumberScale='0' pieSliceDepth='25'>");
            // fetch data reader
            while (oRs.ReadData.Read())
            {
                // create link to javascript  function for ajax post back call
                string link = "javascript:updateChart(" + oRs.ReadData["FactoryId"].ToString() + ")";

                //add set element 
                strXML.AppendFormat("<set label='{0}' value='{1}' link='{2}' />", oRs.ReadData["FactoryName"].ToString(), oRs.ReadData["TotQ"].ToString(), link);
            }

            // close data reader
            oRs.ReadData.Close();

            // close chart element
            strXML.Append("</chart>");

            // create pie chart and store it to output string
            Chart sales = new Chart("pie3d", "myChart1", "440", "350", "xml", strXML.ToString());
            string outPut = sales.Render();

            // write the output string
            Response.Write(outPut);
        }
    }

    /// <summary>
    /// drillDown to show Column2D chart
    /// </summary>
    /// <param name="FacID">Factory Id</param>
    private void drillDown(string FacID)
    {
        //SQL Query for Factory Details for the factory Id passed as parameter
        string strSQL = "select  a.FactoryId,a.FactoryName,b.DatePro,b.Quantity from Factory_Master a,Factory_Output b where a.FactoryId=b.FactoryID and a.FactoryId=" + FacID + " order by b.DatePro";

        // Create data reader
        DbConn oRs = new DbConn(strSQL);

        //strXML for storing XML
        StringBuilder strXML = new StringBuilder();

        //Add Chart element
        strXML.AppendFormat("<chart caption='Factory wise Production' subcaption='Factory {0} : Daily Production' xAxisName='Day' yAxisName='Units' rotateLabels='1' bgAlpha='100' bgColor='ffffff' showBorder='0' showvalues='0' yAxisMaxValue='200'>", FacID);
        //Iterate through database
        while (oRs.ReadData.Read())
        {
            // add set element
            strXML.AppendFormat("<set label='{0}' value='{1}' />", Convert.ToDateTime(oRs.ReadData["DatePro"]).ToString("d/M"), oRs.ReadData["Quantity"].ToString());

        }
        // close data reader
        oRs.ReadData.Close();

        // close chart element
        strXML.Append("</chart>");

        // create Column2D chart and srore it to output string
        Chart sales = new Chart("column2d", "myChart2", "440", "350", "xml", strXML.ToString());
        string outPut = sales.Render();

        // clear the Panel
        Panel1.Controls.Clear();
        //Add chart to the panel 
        Panel1.Controls.Add(new LiteralControl(outPut));

    }

    /// <summary>
    /// show first blank Column2D chart
    /// </summary>
    public void showColumnChart()
    {
        // blank chart element       
        string strXML = "<chart></chart>";

        // create Column2D chart and srore it to output string
       // string outPut = FusionCharts.RenderChart("../FusionCharts/Column2D.swf?ChartNoDataText=Please click on a pie slice to view detailed data.", "", strXML, "chart3", "440", "350", false, false);

        Chart sales = new Chart("column2d.swf", "myChart3", "440", "350", "xml", strXML.ToString());
        
        string outPut = sales.Render();

        // clear the Panel
        Panel1.Controls.Clear();
        // Add output to Panel
        Panel1.Controls.Add(new LiteralControl(outPut));

    }
}
