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
using System.Text;
// Use FusionCharts.Charts name space
using FusionCharts.Charts;

public partial class ArrayExample_Default : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        //In this example, we plot a multi series chart from data contained
        //in an array. The array will have three columns - first one for data label (product)
        //and the next two for data values. The first data value column would store sales information
        //for current year and the second one for previous year.

        //Let//s store the sales data for 6 products in our array. We also store
        //the name of products. 
        object[,] arrData = new object[6, 3];
        //Store Name of Products
        arrData[0, 0] = "Product A";
        arrData[1, 0] = "Product B";
        arrData[2, 0] = "Product C";
        arrData[3, 0] = "Product D";
        arrData[4, 0] = "Product E";
        arrData[5, 0] = "Product F";
        //Store sales data for current year
        arrData[0, 1] = 567500;
        arrData[1, 1] = 815300;
        arrData[2, 1] = 556800;
        arrData[3, 1] = 734500;
        arrData[4, 1] = 676800;
        arrData[5, 1] = 648500;
        //Store sales data for previous year
        arrData[0, 2] = 367300;
        arrData[1, 2] = 584500;
        arrData[2, 2] = 754000;
        arrData[3, 2] = 456300;
        arrData[4, 2] = 754500;
        arrData[5, 2] = 437600;

        //Now, we need to convert this data into multi-series JSON. 
        //We convert using string concatenation.
        //jsonData - Stores the entire JSON string
        //categories - Stores pertial  for the <categories> and child <category> elements
        //currentYear - Stores XML for current year's sales
        //previousYear - Stores XML for previous year's sales
        StringBuilder jsonData = new StringBuilder();
        StringBuilder categories = new StringBuilder();
        StringBuilder currentYear = new StringBuilder();
        StringBuilder previousYear = new StringBuilder();

        //Initialize chart object of the JSON
        jsonData.Append("{" + 
            "'chart': {"+
            // add chart level attrubutes
                "'caption': 'Sales by Product'," + 
                "'numberPrefix': '$',"+
                "'formatNumberScale': '1'," +
                "'placeValuesInside': '1'," +
                "'decimals': '0'" +
            "},");

        //Initial string part of categories element - necessary to generate a multi-series chart
        categories.Append("'categories': [" +
            "{" +
                "'category': [");

        //Initial string part of dataset elements
        currentYear.Append("{" +
                    // dataset level attributes
                    "'seriesname': 'Current Year'," +
                    "'data': [");
        previousYear.Append("{" +
                    // dataset level attributes
                    "'seriesname': 'Previous Year'," +
                    "'data': [");

        //Iterate through the data	
        for (int i = 0; i < arrData.GetLength(0); i++)
        {
            if (i > 0)
            {
                categories.Append(",");
                currentYear.Append(",");
                previousYear.Append(",");
            }
            //Append individual category to strCategories
            categories.AppendFormat("{{" +
                    // category level attributes
                    "'label': '{0}'" +
                "}}", arrData[i, 0]);
            //Add individual data to both the datasets
            currentYear.AppendFormat("{{" +
                    // data level attributes
                    "'value': '{0}'" +
                "}}", arrData[i, 1]);
            previousYear.AppendFormat("{{" +
                    // data level attributes
                    "'value': '{0}'" +
                "}}", arrData[i, 2]);
        }

        //Closing part of the categories object
        categories.Append("]" +
                "}" +
            "],");

        ////Closing part of individual dataset object
        currentYear.Append("]" +
                "},");
        previousYear.Append("]" +
                "}");

        //Assemble the entire XML now
        jsonData.Append(categories.ToString());
        jsonData.Append("'dataset': [");
        jsonData.Append(currentYear.ToString());
        jsonData.Append(previousYear.ToString());
        jsonData.Append("]" +
                "}");

        // Initialize chart - Column 3D Chart with data from Data/Data.json
        Chart sales = new Chart("msline", "myChart", "600", "350", "json", jsonData.ToString());
        // Render the chart
        Literal1.Text = sales.Render();
    }
}
