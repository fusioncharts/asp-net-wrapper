<%@ Page Language="C#" MasterPageFile="MasterPage.master" CodeFile="Default.aspx.cs"
    Inherits="_Default" Title="FusionCharts Example - Using ASP.NET 2.0 Master Page" %>

<asp:Content ID="Content1" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">

    <script language="javascript" type="text/javascript" src="../fusioncharts/fusioncharts.js"></script>

    <%
        //Included FusionCharts.js to embed FusionCharts easily in web pages
        //The following code will generate a chart from code behind file Default.aspx.cs
    %>
    <asp:Literal ID="Literal1" runat="server"></asp:Literal>
</asp:Content>
