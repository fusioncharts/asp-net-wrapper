# FusionCharts ASP.NET Wrapper

### What is FusionCharts .NET wrapper?

FusionCharts Suite XT uses JavaScript to generate charts in the browser. Where using these ASP.NET server side wrapper you can create charts in your ASP.NET website without writing any Javascript code. 

### How does the wrapper work?
Charts are generated in the browsers with the help of JavaScript and the HTML code.
Using this ASP.NET wrapper we can generate the required JavaScript and HTML code as a string in the server. We can put this strings in the page to generate charts.

### Version
1.1

### Requirements
.NET Framework 3.5 or higher

### Installation
 * Add a reference of the FusionCharts assembly in your project.
 * Start using methods and classes available under **"FusionCharts.Charts"** namespace to generate Charts in your project.
 * For a woking sample, the "asp-net-wrapper.zip" can be used.
 
### Usage
##### Chart Class (FusionCharts.Charts)
Represent the FusionCharts class that can be initialized to create a chart.
###### **Constructor parameters:**
Following parameters can be used in the constructor in the order as they are described. All parameters are optional, we can configure them later.

| Parameter | Type | Description |
|:-------|:----------:| :------|
| chartType | `String` | The type of chart that you intend to plot. e.g. `Column3D`, `Column2D`, `Pie2D` etc.|
|chartId | `String` | Id for the chart, using which it will be recognized in the HTML page. Each chart on the page needs to have a unique Id.|
|chartWidth | `String` | Intended width for the chart (in pixels). e.g. `400`|
|chartHeight | `String` | Intended height for the chart (in pixels). e.g. `300`|
|dataFormat | `String` | Type of the data that is given to the chart. e.g. `json`, `jsonurl`, `csv`, `xml`, `xmlurl`|
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
This method can be used to get the value of any chart paramerer. The method has following parameter. This method returns the value of the parameter as a string.

| Parameter | Type | Description |
|:-------|:----------:| :------|
| param | `enum` | Name of chart parameter. e.g. `Chart.ChartParameter.chartType`.|

###### **SetData**
This method can be used to set the data to the chart. The method has following argumets.

| Parameter | Type | Description |
|:-------|:----------:| :------|
| dataSource | `String` | Data for the chart. e.g. `data/data.xml` |
| format | `enum` | Optional. The format of the data. e.g. `Chart.DataFormat.xmlurl` |

###### **Render**
Public method to generate html code for rendering chart. This function assumes that you've already included the FusionCharts JavaScript class in your page. Optionaly, Following parameters can also be passed to the chart in the order as they are described.

| Parameter | Type | Description |
|:-------|:----------:| :------|
| chartType | `String` | The type of chart that you intend to plot. e.g. `Column3D`.|
|chartId | `String` | Id for the chart, using which it will be recognized in the HTML page. Each chart on the page needs to have a unique Id.|
|chartWidth | `String` | Intended width for the chart (in pixels). e.g. `400`|
|chartHeight | `String` | Intended height for the chart (in pixels). e.g. `300`|
|dataFormat | `String` | Type of the data that is given to the chart. e.g. `json`, `jsonurl`, `csv`, `xml`, `xmlurl`|
|dataSource | `String` | Data for the chart. e.g. `{"chart":{},"data":[{"label":"Jan","value":"420000"}]}`|
|bgColor | `String` | Background color of the chart container. e.g. `cccccc`|
|bgOpacity | `String` | Background opacity of the chart container. e.g. `1`|

###### **Clone**
Clone method can be used to clone an existing chart instance. All properties except the chartId of the parent chart instance will be cloned into the child instance. 
```cs
Chart sales = new Chart("column3d", "myChart", "400", "300", "xmlurl", "data/data.xml");
//Render the column3D chart
Literal1.Text = sales.Render();
Chart salesClone = sales.clone();
salesClone.SetChartParameter(Chart.ChartParameter.chartType, "column2d");
//Render the column2D chart
Literal2.Text = salesClone.Render();
```

###License

**FUSIONCHARTS:**

Copyright (c) FusionCharts Technologies LLP  
License Information at [http://www.fusioncharts.com/license](http://www.fusioncharts.com/license)