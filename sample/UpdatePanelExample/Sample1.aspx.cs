using System;
using System.Data;
using System.Configuration;
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
/// FusionCharts and ASP.NET.AJAX Update Panel 
/// </summary>
public partial class _Default : System.Web.UI.Page
{

    protected void Page_Load(object sender, EventArgs e)
    {
        //This will execute first time the page loads and not on ajax post back calls
        if (!IsPostBack)
        {
            //Generate Radio button from the available Factory names in Database
            //Get Factory names from Factory_Master
            string strSQL = "select FactoryId,FactoryName from Factory_Master";
            
            //Open datareader using DBConn object
            DbConn rs1 = new DbConn(strSQL);
            //Fetch all record 
            while (rs1.ReadData.Read())
            {
                //Creating Radio Button List 
                RadioButtonList1.Items.Add(new ListItem(rs1.ReadData["FactoryName"].ToString(), rs1.ReadData["FactoryId"].ToString()));
            }
            // close datareader 
            rs1.ReadData.Close();


            //Select First radio button as dafult value
            RadioButtonList1.Items[0].Selected = true;

            //Show chart as per selected radio button.
            updateChart();
        }
    }

    //When radio button selection changes i.e. selected factory changes
    protected void RadioButtonList1_SelectedIndexChanged(object sender, EventArgs e)
    {
        //Update FusionCharts and gridview with as per selected factory
        updateChart();
    }

    /// <summary>
    /// update FusionCharts and gridview with as per selected factory name
    /// </summary>
    private void updateChart()
    {
        //Get factory details depending on FactoryID from selected Radio Button
        string strSQL = "select DatePro, Quantity from Factory_Output where FactoryId=" + RadioButtonList1.SelectedValue.ToString() + " order by DatePro";

        //Create data reader to bind data with GridView 
        DbConn rs = new DbConn(strSQL);
        //Fillup gridview with data from datareader
        GridView1.DataSource = rs.ReadData;
        // binding the data
        GridView1.DataBind();

        //Create database connection to get data for chart 
        DbConn oRs = new DbConn(strSQL);

        //Create FusionCharts XML
        StringBuilder strXML = new StringBuilder();

        //Create chart element
        strXML.AppendFormat("<chart caption='Factory {0}' showborder='0' bgcolor='FFFFFF' bgalpha='100' subcaption='Daily Production' xAxisName='Day' yAxisName='Units' rotateLabels='1'  placeValuesInside='1' rotateValues='1' >", RadioButtonList1.SelectedValue.ToString());

        //Iterate through database
        while (oRs.ReadData.Read())
        {
            //Create set element
            //Also set date into d/M format
            strXML.AppendFormat("<set label='{0}' value='{1}' />", Convert.ToDateTime(oRs.ReadData["DatePro"]).ToString("d/M"), oRs.ReadData["Quantity"].ToString());
        }

        //Close chart element
        strXML.Append("</chart>");


        //outPut will store the HTML of the chart rendered as string 
        string outPut = "";

        //When the page is loaded for the first time, we call RenderChart() method to avoid IE's 'Click here to Acrtivate...' message
        Chart sales = new Chart("column2d", "myChart", "440", "350", "xml", strXML.ToString());
        outPut = sales.Render();

        //Clear panel which will contain the chart
        Panel1.Controls.Clear();

        //Add Litaral control to Panel which adds the chart from outPut string
        Panel1.Controls.Add(new LiteralControl(outPut));

        // close Data Reader
        oRs.ReadData.Close();
    }

}