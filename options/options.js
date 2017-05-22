var options = {};
// TODO browser.storage.sync
function saveOptions(){ 
    // Call pinboard to check if the API key is working
    let headers = new Headers({"Accept": "application/json"});
    let apikey = document.querySelector("#apikey").value;
    let init = {method: 'GET', headers};
    let request = new Request("https://api.pinboard.in/v1/user/api_token/?auth_token="+apikey+"&format=json", init);
    fetch(request).then(function(response){
        if(!response) {
            console.log("Error while parsing result");
            document.querySelector("#testresult").innerHTML = "Error!";
            return;
        }
        response.json().then(json => {
            if(json.result == apikey.split(":")[1]) {
                browser.storage.local.set({
                    apikey: document.querySelector("#apikey").value
                });
                console.log("Saved successfully");
                document.querySelector("#testresult").innerHTML = "Saved!";
                document.querySelector("#apikey").value="";
            }
            else {
                console.log("Error while parsing result");
                document.querySelector("#testresult").innerHTML = "Error!";
                return;
            }
        });
    }); 
}

function handleOptionChange(e){
    options[e.target.name] = e.target.value || e.target.checked;
    let o = {options};
    browser.storage.local.set(o);
}

document.querySelector('#changeActionbarIcon').addEventListener("change", handleOptionChange);
document.querySelector("#showBookmarked").addEventListener("change", handleOptionChange);
document.querySelector("#saveapi").addEventListener("click", saveOptions);
document.querySelectorAll(".shortcuts").forEach((element) => {
    element.addEventListener("change", handleOptionChange);
});

browser.storage.local.get("options").then((token) => {
    options = token.options;
    if(!!token.options.showBookmarked && token.options.showBookmarked) {
        document.querySelector("#showBookmarked").checked = true;
    }
    if(!!token.options.changeActionbarIcon && token.options.changeActionbarIcon) {
        document.querySelector("#changeActionbarIcon").checked = true;
    }
    Object.keys(token.options).forEach((k,v) => {
        console.log(k, token.options[k]);
        if(k !== "showBookmarked" && k !== "changeActionbarIcon"){
            document.querySelector('input[name='+k+']').value =token.options[k]; 
        }
    });

});