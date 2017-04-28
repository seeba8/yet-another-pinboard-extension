function saveOptions(e){
    e.preventDefault();
      
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
function handleShowBookmarkedChanged(event){
    console.log(event.target.checked);
    browser.storage.local.set({options: {showBookmarked:event.target.checked}});
}

document.querySelector("#showBookmarked").addEventListener("change", handleShowBookmarkedChanged);
document.querySelector("form").addEventListener("submit", saveOptions);

browser.storage.local.get("showBookmarked").then((token) => {
    if(!!token.showBookmarked && token.showBookmarked) {
        document.querySelector("#showBookmarked").checked = true;
    }
});