<%@ Page Language="C#" AutoEventWireup="true" CodeFile="Sample2.aspx.cs" Inherits="nextSample" %>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>FusionCharts - Simple</title>
    <!-- FusionCharts script tag -->
    <script type="text/javascript" src="../fusioncharts/fusioncharts.js"></script>
    <!-- End -->
    <script type="text/javascript" src="JS/jquery.min.js"></script>
    <style type="text/css">
        h2.headline
        {
            font: normal 110%/137.5% "Trebuchet MS" , Arial, Helvetica, sans-serif;
            padding: 0;
            margin: 25px 0 25px 0;
            color: #7d7c8b;
            text-align: center;
        }
        p.small
        {
            font: normal 68.75%/150% Verdana, Geneva, sans-serif;
            color: #919191;
            padding: 0;
            margin: 0 auto;
            width: 664px;
            text-align: center;
        }
    </style>
</head>
<body>
    <form id="form1" runat="server">
    <div id="wrapper">
        <asp:ScriptManager ID="ScriptManager1" runat="server">
            <Scripts>
                <asp:ScriptReference Path="~/UpdatePanel/JS/updatepanelhook.fusioncharts.js" />
            </Scripts>
        </asp:ScriptManager>
        <div id="header">
            <div class="logo">
            <h1 class="brand-name">FusionCharts XT</h1>
            <h1 class="logo-text">Using ASP.NET(C#) Update Panel</h1>
        </div>
        <div class="content-area">
            <div id="content-area-inner-main">
                <p class="text" align="center">
                    </p>
                <div class="gen-chart-render">
                    <table width="890" cellpadding="0">
                        <tr>
                            <td align="center" valign="middle" colspan="2">
                                <h2 class="headline">Please Click on a Factory on the Pie chart below to see details</h2>
                            </td>
                        </tr>
                        <tr>
                            <td valign="middle" style="width: 440px; height: 299px; border: #cdcdcd 1px dotted;"
                                align="center">
                                <script language="javascript" type="text/javascript">
                                    //Call Ajax PostBack Function
                                    function updateChart(factoryId) {
                                        // Call drillDown C# function by Ajax
                                        //we pass the name of the function ('drillDown') to call 
                                        //and the parameter (i.e., factoryId) to be passed to it
                                        //both separated by a delimiter(here we use $, you can use anything)
                                        __doPostBack("Panel1", "drillDown$" + factoryId);
                                    }
                                </script>
                                <% //Show Pie Chart %>
                                <%showPieChart();%>
                            </td>
                            <td valign="middle" style="width: 440px; border: 1px dotted #cdcdcd;">
                            <div style="position:relative;">
                                <asp:UpdateProgress ID="UpdateProgress2" runat="server" DisplayAfter="1" >
                                    <ProgressTemplate>
                                        <img src="Images/loading.gif"  />
                                    </ProgressTemplate>
                                </asp:UpdateProgress>
                                
                                <asp:UpdatePanel ID="FusionChartsUP" runat="server" >
                                    <ContentTemplate>
                                        <asp:Panel ID="Panel1" runat="server" Height="350px" Width="440px">
                                            <img src="Images/loading.gif" />
                                        </asp:Panel>
                                    </ContentTemplate>
                                </asp:UpdatePanel>
                                </div>
                               
                            </td>
                        </tr>
                    </table>
                </div>
                <p>&nbsp;</p>
                <div class="underline-dull">
            </div>
            <div>
            </div>
            <p>&nbsp;</p>
            <p class="small">
                <!--<p class="small">This dashboard was created using FusionCharts XT, FusionWidgets v3 and FusionMaps v3 You are free to reproduce and distribute this dashboard in its original form, without changing any content, whatsoever. <br />
            &copy; All Rights Reserved</p>
          <p>&nbsp;</p>-->
            </p>
            
            </div>
        </div>
    </div>
    <div id="footer">
        <ul>
            <li><a href="http://www.fusioncharts.com/documentation/"><span>&laquo; Documentation</span></a></li>
        </ul>
    </div>
    </form>
</body>
</html>
