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

public partial class ArrayExample_Combination : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        //In this example, we plot a Combination chart from data contained
        //in an array. The array will have three columns - first one for Quarter Name
        //second one for sales figure and third one for quantity. 

        object[,] arrData = new object[4, 3];
        //Store Quarter Name
        arrData[0, 0] = "Quarter 1";
        arrData[1, 0] = "Quarter 2";
        arrData[2, 0] = "Quarter 3";
        arrData[3, 0] = "Quarter 4";
        //Store revenue data
        arrData[0, 1] = 576000;
        arrData[1, 1] = 448000;
        arrData[2, 1] = 956000;
        arrData[3, 1] = 734000;
        //Store Quantity
        arrData[0, 2] = 576;
        arrData[1, 2] = 448;
        arrData[2, 2] = 956;
        arrData[3, 2] = 734;

        //Now, we need to convert this data into combination XML. 
        //We convert using string concatenation.
        //strXML - Stores the entire XML
        //strCategories - Stores XML for the <categories> and child <category> elements
        //strDataRev - Stores XML for current year's sales
        //strDataQty - Stores XML for previous year's sales
        
        StringBuilder strXML=new StringBuilder();
        StringBuilder strCategories = new StringBuilder();
        StringBuilder strDataRev=new StringBuilder();
        StringBuilder strDataQty=new StringBuilder();

        //Initialize <chart> element
        strXML.Append("<chart palette='4' caption='Product A - Sales Details' PYAxisName='Revenue' SYAxisName='Quantity (in Units)' numberPrefix='$' formatNumberScale='0' showValues='0' decimals='0' >");

        //Initialize <categories> element - necessary to generate a multi-series chart
        strCategories.Append("<categories>");

        //Initiate <dataset> elements
        strDataRev.Append("<dataset seriesName='Revenue'>");
        strDataQty.Append("<dataset seriesName='Quantity' parentYAxis='S'>");

        //Iterate through the data	
        for (int i = 0; i < arrData.GetLength(0); i++)
        {
            //Append <category name='...' /> to strCategories
            strCategories.AppendFormat("<category name='{0}' />",arrData[i, 0]);
            //Add <set value='...' /> to both the datasets
            strDataRev.AppendFormat("<set value='{0}' />",arrData[i, 1]);
            strDataQty.AppendFormat("<set value='{0}' />",arrData[i, 2]);
        }

        //Close <categories> element
        strCategories.Append("</categories>");

        //Close <dataset> elements
        strDataRev.Append("</dataset>");
        strDataQty.Append("</dataset>");

        //Assemble the entire XML now
        strXML.Append(strCategories.ToString());
        strXML.Append(strDataRev.ToString());
        strXML.Append(strDataQty.ToString());
        strXML.Append("</chart>");

        // Initialize chart - Column 3D Chart with data from Data/Data.json
        Chart sales = new Chart("mscombidy2d", "myChart", "600", "350", "xml", strXML.ToString());
        // Render the chart
        Literal1.Text = sales.Render();
    }

}
