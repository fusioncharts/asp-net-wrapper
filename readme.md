# FusionCharts ASP.NET with C# Wrapper

### What is FusionCharts .NET wrapper?

The FusionCharts server-side ASP.Net wrapper lets you create charts in your ASP.NET website without having to write any JavaScript code. 

### How does the wrapper work?
Conventionally, FusionCharts Suite XT uses JavaScript and HTML to generate charts in the browser. The ASP.Net C# wrapper lets you generate the required JavaScript and HTML code as a string on the server. This string is then inserted in the web page for generating charts.


### Version
1.3

### Requirements
.NET Framework 3.5 or higher

### Installation
 * Download the **[fusioncharts-suite-xt](http://www.fusioncharts.com/)**
 * Unzip the archive and move to "integrations > asp.net-cs > fusioncharts-wrapper-source" to get the "FusionCharts.cs" file.
 * Copy "FusionCharts.cs" to App_Code folder inside your project.
 
 Or 
 
 You can add dll file reference in your project
 
 * Download the **[fusioncharts-suite-xt](http://www.fusioncharts.com/)**
 * Unzip the archive and move to "integrations > asp.net-cs > fusioncharts-wrapper-assembly" to get the "FusionCharts.dll" file.
 * Add reference to your project.
 
### Usage
#### Installing FusionCharts JS libraries in your page where you want to display FusionCharts
There are two ways you can install the FusionCharts JS libray in your project
* Using FusionCharts CDN
* Using library files placed in the folder of your project

**Using FusionCharts CDN**

Write a script tag in the <head> section of the page where you want to add the source of the FusionCharts library link from the official CDN:
```html
<script type="text/javascript" src="http://static.fusioncharts.com/code/latest/fusioncharts.js"></script>
```
**Using library files placed in a folder of your project**

You can download the [trial version](http://www.fusioncharts.com/download/) of FusionCharts.

Next assuming you have the FusionCharts library placed inside the "fusioncharts" folder  in your project, write a script tag in the <head> section of the page where you add the src of FusionCharts libary link from local folder
```html
<script type="text/javascript" src="fusioncharts/fusioncharts.js"></script>
```
Now, you are ready to prepare the chart using our ASP-C#-wrapper.

#### Using the wrapper
#### Step 1:
**Include the wrapper source file (`FusionCharts.cs`) or wrapper dll (`FusionCharts.dll`) to your CS page:**

* Include the package inside your project (See [Installation Guide](#Installation))
* Add the reference of the file to the page where you want to display FusionCharts. To do so write the following code befor the class description begins of your page.
```c#
using FusionCharts.charts;
```
#### Step 2:
**Add a asp literal to the aspx page where FusionCharts will be displayed**
```HTML
 <asp:Literal ID="Literal1" runat="server"></asp:Literal>
```
#### Step 3:
**Create a chart object that consists of the information required to render the chart. check [`Constructor Parameters`](#constructor-parameters) Also set the information needed for a chart**
```c#
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

```
#### Step 4:
**Render the chart**

```c#
Literal1.Text = sales.Render();
```
##### Chart Class (FusionCharts.Charts)
Represent the FusionCharts class that can be initialized to create a chart.
###### **Constructor parameters:**
The following parameters can be used in the constructor in the order as they are described in the table. All parameters are optional, and can be configured later.

| Parameter | Type | Description |
|:-------|:----------:| :------|
| chartType | `String` | The type of chart that you intend to plot. e.g. `column3D`, `column2D`, `pie2D` etc.|
|chartId | `String` | Unique ID for the chart, using which it will be recognized in the HTML page. Each chart on the page needs to have a unique ID.|
|chartWidth | `String` | Intended width for the chart (in pixels). e.g. `400`|
|chartHeight | `String` | Intended height for the chart (in pixels). e.g. `300`|
|dataFormat | `String` | Type of data that will be given to the chart. e.g. `json`, `jsonurl`, `xml`, `xmlurl`|
|dataSource | `String` | Actual data for the chart. e.g. `{"chart":{},"data":[{"label":"Jan","value":"420000"}]}`|
|bgColor | `String` | Background color of the chart container. e.g. `cccccc`|
|bgOpacity | `String` | Background opacity of the chart container. e.g. `1`|

##### Methods under Chart class

###### **SetChartParameter**
This method can be used to set or modified various chart paramerers like `chartType`, `chartWidth`, `chartHeight` etc. The method has following parameters:

| Parameter | Type | Description |
|:-------|:----------:| :------|
| param | `enum` | Name of chart parameter. e.g. `Chart.ChartParameter.chartType`.|
| value | `String` | Value of chart parameter. e.g. `column2d` |

###### **GetChartParameter**
This method is used to get the value of any chart parameter.The parameter value is returned as a string. This method takes the following parameter: 

| Parameter | Type | Description |
|:-------|:----------:| :------|
| param | `enum` | Name of chart parameter. e.g. `Chart.ChartParameter.chartType`.|

###### **SetData**
This method is used to set the data for the chart. It takes the following argumets.

| Parameter | Type | Description |
|:-------|:----------:| :------|
| dataSource | `String` | Data for the chart. e.g. `data/data.xml` |
| format | `enum` | Format of the data (optional). e.g. `Chart.DataFormat.xmlurl` |

###### **Render**
This is a public method used to generate the html code for rendering a chart. This function assumes that you've already included the FusionCharts JavaScript class in your page. Optionally, the following parameters can also be passed to the chart in the order as they are described below.

| Parameter | Type | Description |
|:-------|:----------:| :------|
| chartType | `String` | The type of chart that you intend to plot. e.g. `column3D`.|
|chartId | `String` | Unique ID for the chart, using which it will be recognized in the HTML page. Each chart on the page needs to have a unique ID.|
|chartWidth | `String` | Intended width for the chart (in pixels). e.g. `400`|
|chartHeight | `String` | Intended height for the chart (in pixels). e.g. `300`|
|dataFormat | `String` | Type of data that is given to the chart. e.g. `json`, `jsonurl`, `xml`, `xmlurl`|
|dataSource | `String` | Data for the chart. e.g. `{"chart":{},"data":[{"label":"Jan","value":"420000"}]}`|
|bgColor | `String` | Background color of the chart container. e.g. `cccccc`|
|bgOpacity | `String` | Background opacity of the chart container. e.g. `1`|

###### **AddEvent**
This is a public method used to generate the html code to add an event to a chart. This function assumes that you've already included the FusionCharts JavaScript class in your page. The following parameters have to be passed in order to attach event function.

| Parameter | Type | Description |
|:-------|:----------:| :------|
| eventName | `String` | which event you want to bind. e.g. `dataLoaded`.|
|funcName | `String` | javascript function, which is written in your client side code|

chartObj.AddEvent("dataLoaded", "onDataLoaded");

###### **AddMessage**
This is a public method used to generate the html code to attach an event to a chart. This function assumes that you’ve already included the FusionCharts JavaScript class in your page. The following parameters have to be passed in order to attach event through addEvent function.

| Parameter | Type | Description |
|:-------|:----------:| :------|
| messageAttribute | `String` |  parameter want to customize. e.g. `loadMessage`.|
|messageAttributeValue | `String` | Your custom message|

chartObj.AddMessage("loadMessage", "please wait data is being loaded");

###### **Clone**
This method is used to clone an existing chart instance. All properties except the chartId of the parent chart instance will be cloned into the child instance. 
```cs
Chart sales = new Chart("column3d", "myChart", "400", "300", "xmlurl", "data/data.xml");
//Render the column3D chart
Literal1.Text = sales.Render();
Chart salesClone = (Chart)sales.clone();
salesClone.SetChartParameter(Chart.ChartParameter.chartType, "column2d");
//Render the column2D chart
Literal2.Text = salesClone.Render();
```

### **FusionTime:**

**Create the chart object with TimeSeries chart with the required parameters as shown below.**

```c#
FusionTable fusionTable = new FusionTable(schema, data);
TimeSeries timeSeries = new TimeSeries(fusionTable);

// Wrapper constructor parameters
// charttype, chartID, width, height, data format, TimeSeries object

Chart fcChart = new Chart("timeseries", "MyFirstChart" , "700", "450", "json", timeSeries);

// Render the chart
Literal1.Text = fcChart.Render();
```
There are two classes that you need to use in order to create a TimeSeries chart, `FusionTable` and `TimeSeries`.

### **Constructor parameters of FusionTable :**
This class creates `timeseries` compatible `FusionTable` object which later passed to the TimeSeries class constructor.

```c#
// Creating FusionTable
FusionTable fusionTable = new FusionTable(schema, data);
```

Let you set the following parameters in FusionTable constructor.

| Parameter | Type | Description |
|:-------|:----------:| :------|
|schema | `String` | The schema which defines the properties of the columns|
|data | `String` | The actual values for each row and column of the DataTable|

### **Data operation:**

FusionTable also supports following DataTable operations:

* Select
* Sort
* Filter
* Pipe

**`Select`** operation should be used only when you want to see few specific columns of the DataTable.

```c#
FusionTable fusionTable = new FusionTable(schema, data);

// Column names as parameter
fusionTable.Select("Country", "Sales");
```

| Parameter | Type | Description |
|:-------|:----------:| :------|
|columnName | `String` | Define multiple columns name.|

**`Sort`** one of the major requirements while working with large sets of data is to sort the data in a specific order - most commonly, ascending or descending.

```c#
FusionTable fusionTable = new FusionTable(schema, data);

//column name and orderby
fusionTable.Sort("Sales", FusionTable.OrderBy.ASC);
```

| Parameter | Type | Description |
|:-------|:----------:| :------|
|columnName | `String` | Define column name on which sorting will be applied.|
|columnOrderBy | `Enum` | To sort the column in descending or ascending order. e.g. `FusionTable.OrderBy.ASC, FusionTable.OrderBy.DESC`|

**`Filter`** comes with a set of operations that you can use to filter data values from a large dataset, based on one or more conditions. Supported filter operations are:

* Equals
* Greater
* GreaterEquals
* Less
* LessEquals
* Between

```c#
// Filter - Equal
// Creating filter statement by passing the filter type, column name and filter value
String filter1 = fusionTable.CreateFilter(FusionTable.FilterType.Equals, "Country", "United States");

//Applying the filter on fusion table
fusionTable.ApplyFilter(filter1);
```

```c#
// Filter - Greater
// Creating filter statement by passing the filter type, column name and filter value
String filter1 = fusionTable.CreateFilter(FusionTable.FilterType.Greater, "Quantity", 100);

//Applying the filter on fusion table
fusionTable.ApplyFilter(filter1);
```

```c#
// Filter - GreaterEquals
// Creating filter statement by passing the filter type, column name and filter value
String filter1 = fusionTable.CreateFilter(FusionTable.FilterType.GreaterEquals, "Quantity", 100);

//Applying the filter on fusion table
fusionTable.ApplyFilter(filter1);
```

```c#
// Filter - Less
// Creating filter statement by passing the filter type, column name and filter value
String filter1 = fusionTable.CreateFilter(FusionTable.FilterType.Less, "Quantity", 100);

//Applying the filter on fusion table
fusionTable.ApplyFilter(filter1);
```

```c#
// Filter - LessEquals
// Creating filter statement by passing the filter type, column name and filter value
String filter1 = fusionTable.CreateFilter(FusionTable.FilterType.LessEquals, "Quantity", 100);

//Applying the filter on fusion table
fusionTable.ApplyFilter(filter1);
```

```c#
// Filter - Between
// Creating filter statement by passing the filter type, column name and filter value
String filter1 = fusionTable.CreateFilter(FusionTable.FilterType.Between, "Quantity", 100, 1000);

//Applying the filter on fusion table
fusionTable.ApplyFilter(filter1);
```

let you set the following parameter of `CreateFilter` method for creating filter statement.

| Parameter | Type | Description |
|:-------|:----------:| :------|
|filterType | `Enum` | Define the filter type. e.g. `FusionTable.FilterType.Equals`, `FusionTable.FilterType.Greater` etc.|
|columnName | `String` | Define column name on which the filter will be applied.|
|values | `Object` | Define filter value(s). e.g. `String`, `Integer` values.|

let you set the following parameter of `ApplyFilter` method for applying the filter on fusion table.

| Parameter | Type | Description |
|:-------|:----------:| :------|
|filter | `String` | Define the `Filter statement`|

```c#
// Filter - Apply conditional filter
// Define anonymous function to filter
fusionTable.ApplyFilterByCondition(@"(row, columns) => {
                   	return row[columns.Country] === 'USA' ||
                   	(row[columns.Sales] > 100 && row[columns.Shipping_Cost] < 10);
                    }");
```

**`Pipe`**  is an operation which lets you run two or more data operations in a sequence. Instead of applying multiple filters one by one to a DataTable which creates multiple DataTable(s), you can combine them in one single step using pipe and apply to the DataTable. This creates only one DataTable.

```c#
FusionTable fusionTable = new FusionTable(schema, data);

// Creating first filter statement by passing the filter type, column name and filter value
String filter1 = fusionTable.CreateFilter(FusionTable.FilterType.Equals, "Country", "India");

// Creating second filter statement by passing the filter type, column name and filter value
String filter2 = fusionTable.CreateFilter(FusionTable.FilterType.Greater, "Quantity", 100);

//Applying multiple filters one by one to a DataTable
fusionTable.Pipe(filter1, filter2);  
```

| Parameter | Type | Description |
|:-------|:----------:| :------|
|filters | `String` | Define multiple filters.|

### **Constructor parameter of TimeSeries :**
This class creates `timeseries` compatible `TimeSeries` object which later passed to the chart object.

```c#
// Creating TimeSeries object
TimeSeries timeSeries = new TimeSeries(fusionTable);
```

let you set the following parameter in TimeSeries constructor.

| Parameter | Type | Description |
|:-------|:----------:| :------|
|fusionTable | `FusionTable` | The Datatable which defines the schema and actual data (FusionTable).|

#### Methods ####

**`AddAttribute`** is a public method to accept data as a form of JSON string to configure the chart attributes. e.g. `caption`, `subCaption`, `xAxis` etc.

```c#

FusionTable fusionTable = new FusionTable(schema, data);
TimeSeries timeSeries = new TimeSeries(fusionTable);
 
timeSeries.AddAttribute("caption", @"{
                                    	text: ' Online Sales'
                                  	}");
```

let you set the following parameter in `AddAttribute` method.

| Parameter | Type | Description |
|:-------|:----------:| :------|
|key | `String` | The attribute name.|
|value | `String` | Define json formatted value.|

### License

The FusionCharts ASP.NET integration component is open-source and distributed under the terms of the MIT/X11 License. However, you will need to download and include FusionCharts library in your page separately, which has a [separate license](https://www.fusioncharts.com/buy).
