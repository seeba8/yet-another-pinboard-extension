var bookmarkList = document.getElementById("bookmarks");
browser.storage.local.get("pins").then((token) =>{
    let pins = new Map(token.pins);
    for(var [key, pin] of pins) {
        addListItem(pin, key);
        //bookmarkList.options[bookmarkList.options.length] = new Option(pin.description, key);
    }
});

document.getElementById("filter").addEventListener("keyup", handleFilterChange);
document.getElementById("deleteBookmark").addEventListener("click", handleDelete);

function handleDelete(e) {
    console.log("DELETING!!!");
    browser.storage.local.get("apikey").then((token) => {
        let headers = new Headers({"Accept": "application/json"});
        let apikey = token.apikey;
        let init = {method: 'GET', headers};
        let request = new Request("https://api.pinboard.in/v1/posts/delete/?auth_token=" + apikey + 
                "&url=" + encodeURIComponent(document.getElementById("url").value) + "&format=json", init);
        fetch(request).then(function(response){
            if(response.status == 200 && response.ok){
                response.json().then(json => {
                    if(json.result_code=="done") {
                        // delete from storage using document.[...].dataset["entryID"].slice(3) for the ID
                        // delete from local list
                    }
                });
            }
        });
    });
}

function handleSubmit(e) {
    e.preventDefault();
}

document.getElementById("editform").addEventListener("submit",handleSubmit);
function handleFilterChange(e) {
    document.querySelectorAll("#bookmarks li a").forEach(element => {
        if(element.innerHTML.toLowerCase().indexOf(document.getElementById("filter").value.toLowerCase()) > -1) {
            element.parentNode.style.display="";
        }
        else{
            element.parentNode.style.display="none";
        }
    });
}

function handleEditBookmark(e){
    e.preventDefault();
    let pin = document.getElementById(e.target.dataset.entryId);
    document.getElementById("description").value = pin.textContent;
    document.getElementById("url").value = pin.href;
    document.getElementById("tags").value = pin.title;
    document.getElementById("editwrapper").style.display ="block";
    document.getElementById("listdiv").style.maxHeight = "360px";
    document.getElementById("deleteBookmark").dataset["entryId"] = e.target.dataset.entryId;
}

function handleLinkClick(e){
    e.preventDefault();
    if(e.button == 1 || e.ctrlKey) {
        browser.tabs.create({url: e.target.href});
    }
    else{
        browser.tabs.update({url: e.target.href});
    }
    window.close();
}

function addListItem(pin,key){
    let entry = document.createElement('li');
    let edit = document.createElement("a");
    edit.appendChild(document.createTextNode("\u{270E}"));
    edit.addEventListener("click",handleEditBookmark);
    edit.dataset.entryId = "pin"+key;
    entry.appendChild(edit);
    let link = document.createElement("a");
    link.href=pin.href;
    link.addEventListener("click",handleLinkClick);
    link.id="pin"+key;
    link.appendChild(document.createTextNode(pin.description));
    link.title = pin.tags;
    entry.appendChild(link);
    bookmarkList.appendChild(entry);
}