// Hook up Application event handlers.
var app = Sys.Application.add_init(__fc__AJAX_ApplicationInit);

// Application event handlers for component developers.
function __fc__AJAX_ApplicationInit(sender) {
    
    var prm = Sys.WebForms.PageRequestManager.getInstance();
    if (!prm.get_isInAsyncPostBack()) {
        prm.add_pageLoaded(__fc__AJAX_PageLoaded);
    }
}
function __fc__AJAX_PageLoaded(sender, args) {
   
    if (args._panelsUpdated.length != 0) {
        for (var i in args._panelsUpdated) {
            if ($) {
                var html = args._panelsUpdated[i].innerHTML;
                if (html.search(/\<script[\s\S]+?\<\/script\>/i) >= 0) {
                    $("#" + args._panelsUpdated[i].id).html(args._panelsUpdated[i].innerHTML);
                }
            }
        }
    }
}
