// TEMPLATES
const tmpMsgTxt = document.querySelector("#msg-txt");
const tmpMsgTxtReply = document.querySelector("#msg-reply");
const tmpMsgSys = document.querySelector("#msg-sys");
const tmpMsgImg = document.querySelector("#img-regular");

// TEMPLATES END HERE

// NORMAL VARIABLES
const divProfilePic = document.querySelector("#profile-pic");
const spanProfileName = document.querySelector("#profile-name span");
const divAllMsgs = document.querySelector("#all-msgs-from-chat");
let chatId = "";
let chatListMsgsLoadedCounter = 0; // MUST START FROM 0 - USED FOR "from_limit" sql query 
const CHATLISTMSGLIMIT = 200; // TOTAL MESSAGES TO LOAD IN EVERY QUERY
const spinner = document.createElement('div');
spinner.setAttribute("id", "spinner");
spinner.innerText = "LOADING...";

const spinnerObserver = new IntersectionObserver(entries => {
    entries.forEach(s => {
        if (s.isIntersecting) {
            spinnerCallBack();
        } else {
            spinnerLeftBack();
        }
    })
}, {});
function spinnerCallBack() {
    console.log("callback called");
    getChatMsgs(chatId, chatListMsgsLoadedCounter, CHATLISTMSGLIMIT).then(msgs => {
        handleMsgs(msgs); // fetched msgs
        divAllMsgs.removeChild(spinner);
        divAllMsgs.appendChild(spinner);
    });
    chatListMsgsLoadedCounter += CHATLISTMSGLIMIT;
}
function spinnerLeftBack() {
    console.log("leftback called");
}
const epoch2DateTime = (ts) => {
    var date = new Date(ts);
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var seconds = date.getSeconds();
    var ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;
    return {
        'date': date,
        'hrs': hours,
        'mins': minutes,
        'secs': seconds,
        'ampm': ampm
    }
}
const doesFileExist = async (urlToFile) => {
    const response = await fetch(urlToFile);
    console.log(`doesFileExist("${urlToFile}") response.status: ${response.status !== 404}`);
    return (response.status === 200)?true:false;
}
const loadChat = (chat_div) => {
    // DO NOTHING IF CLICKED ON ALREADY LOADED CHAT
    if (chatId == chat_div.getAttribute("chatListId")) {
        console.log("chat already loaded");
        return;
    }
    // RESET THINGS
    spinnerObserver.unobserve(spinner); // reset spinnerObserver
    divAllMsgs.replaceChildren(); // reset divAllMsgs first
    chatListMsgsLoadedCounter = 0; // reset loaded messages counter
    chatId = chat_div.getAttribute("chatListId");
    spinner.innerText = "LOADING...";
    // reset all chats active class
    document.querySelectorAll('#pane-side .chat').forEach(n => n.classList.remove('active'));
    // set this chat's bg
    chat_div.classList.add("active");
    // set chat header sender's status
    document.querySelector("#profile-chat-subtitle").innerText = chat_div.getAttribute("chatListStatus");

    divProfilePic.innerHTML = chat_div.querySelector(".chat-img-profile").innerHTML;
    spanProfileName.innerHTML = chat_div.querySelector(".chat-sender").innerHTML;
    // divAllMsgs.innerHTML = `
    //     <div style="flex: 1 1 auto; min-height: 12px;"></div>`;
    getChatMsgs(chatId, chatListMsgsLoadedCounter, CHATLISTMSGLIMIT).then(msgs => {
        handleMsgs(msgs, true); // fetched msgs
        divAllMsgs.appendChild(spinner);
    });
    chatListMsgsLoadedCounter += CHATLISTMSGLIMIT;
    // Intersection observer should observe spinner here
    spinnerObserver.observe(spinner);
}

function handleMsgs(data, firstTime = false) {
    // if there are no messages stop the spinner observer and return
    if (data == "NO_MORE_MSGS") {
        console.log("No more messages for this chat.");

        spinnerObserver.unobserve(spinner);
        spinner.innerText = "NO MORE MESSAGES.";
        return;
    }
    // clear the div if its first time loading a chat
    if (firstTime) { divAllMsgs.innerHTML = ""; }

    // STORING THE LAST MSG FOR Comparison etc.
    let lastMsg = {}

    // load messages
    for (msg of data) {
        if (msg['message_type'] == 0) {
            const tmpMsgTxtClone = tmpMsgTxt.content.cloneNode(true);
            const tmpMsgTxtCloneApp = tmpMsgTxtClone.querySelector("div[data-temp-id='append-here']");
            // INTIALIZING templateClone default attributes
            tmpMsgTxtClone.querySelector("div[data-temp-id='main']").setAttribute("msgid", msg['_id']);
            tmpMsgTxtClone.querySelector("div[data-temp-id='main']").setAttribute("msgchatrowid", msg['chat_row_id']);
            tmpMsgTxtClone.querySelector("div[data-temp-id='main']").setAttribute("msgkeyid", msg['key_id']);
            tmpMsgTxtClone.querySelector("div[data-temp-id='main']").setAttribute("msgjidrawstring", msg['jid_raw_string']);
            tmpMsgTxtClone.querySelector("div[data-temp-id='main']").setAttribute("displayName", msg['wa_display_name']);
            tmpMsgTxtClone.querySelector("div[data-temp-id='main']").setAttribute("timesent", msg['timestamp']);

            // need to add marg-bottom-2px if the current msg has same sender as the previous one
            if (msg['sender_jid_row_id'] == lastMsg['sender_jid_row_id'] && msg['message_type'] != 7) {
                // If the current msg has the same sender as the last msg
                // and is not a system message then add margin bottom 2 class
                tmpMsgTxtClone.querySelector("div[data-temp-id='main']").classList.add("marg-bottom-2px");
                // Otherwise margin-bottom is 12px by default
            }
            // If its not a group chat message then set sender to #profile-name.innerText
            if (msg['from_me'] == 1) {
                tmpMsgTxtClone.querySelector("div[data-temp-id='main']").classList.add("message-out");
            } else {
                tmpMsgTxtClone.querySelector("div[data-temp-id='main']").classList.add("message-in");
                // Removing Blue double tick if its group chat and message wasn't from me
                if (msg['recipient_count'] > 0) {
                    // recipient_count seems like a nice way to know if its group message
                    tmpMsgTxtClone.querySelector("span[data-temp-id='msg-dblcheck']").classList.remove("clr-icon-ack");
                } else {
                    // NOT A GROUP CHAT MSG - REMOVE DOUBLE TICK SUPPORT
                    tmpMsgTxtClone.querySelector("div[data-testid='msg-meta']").removeChild(tmpMsgTxtClone.querySelector("div[data-temp-id='msg-dblcheck-div']"))
                }
            }
            tmpMsgTxtClone.querySelector("span[data-temp-id='my-text']").innerText = msg['text_data'];
            msgDateTime = epoch2DateTime(msg['timestamp']);
            tmpMsgTxtClone.querySelector("span[data-temp-id='msg-time']").innerText = `${msgDateTime['hrs']}:${msgDateTime['mins']} ${msgDateTime['ampm']}`;
            // If current message is a text and is a reply to some other message — append the reply template to the current msg template
            if (msg['lookup_tables'] == 2) {
                // Current message has "reply to message" attached with it
                // Now "reply to message" can come in all shapes and forms
                // for example it could be an image,video,location,doc etc
                // So all the for "reply to message" type goes here
                if (msg['message_quoted_message_type'] == 0) {
                    // clone template msg-reply
                    tmpMsgTxtCloneApp.prepend(tmpMsgTxtReply.content.cloneNode(true));
                    tmpMsgTxtClone.querySelector("span[data-temp-id='sender-name']").innerText = document.querySelector("#profile-name").innerText;
                    tmpMsgTxtClone.querySelector("span[data-temp-id='sender-text']").innerText = msg['message_quoted_text_data'];
                }
            }
            // Appending regular msg
            divAllMsgs.appendChild(tmpMsgTxtClone);

        } else if (msg['message_type'] == 1) {
            // If the msg is an image then copy the msg-sys template and prepend img-regular template to ifty
            const tmpMsgSysClone = tmpMsgSys.content.cloneNode(true);
            const tmpMsgImgClone = tmpMsgImg.content.cloneNode(true);
            // Important to add message in or message out class
            // If its not a group chat message then set sender to #profile-name.innerText
            if (msg['from_me'] == 1) {
                tmpMsgSysClone.querySelector("div[data-temp-id='main']").classList.add("message-out");
            } else {
                tmpMsgSysClone.querySelector("div[data-temp-id='main']").classList.add("message-in");
            }
            // Modify the default template thumbnail with msg thumbnail
            tmpMsgImgClone.querySelector("img[data-temp-id='img-thumb']").src = "data:image/jpeg;base64," + msg['thumbnail'];
            // default width and height for image (stole from stackoverflow and changed math.min to max)
            let ratio = Math.max(235 / msg['media_width'], 100 / msg['media_height']);
            // let correctAR = {width: msg['media_width']*ratio, height: msg['media_height']*ratio };
            // let defaultAspectRatio =  ([1040,1152,1280,1348,1170].includes(msg['media_height']))?"width:240px;height:320px":"width:330px;height:223.667px";
            tmpMsgImgClone.querySelector("div[data-temp-id='img-outer']").style = `width:${msg['media_width'] * ratio}px;height:${msg['media_height'] * ratio}px;`;

            // Lets check if we have the larger version of the img
            if (msg['media_file_path'] != null) {
                const fileExists = doesFileExist("/static/" + msg['media_file_path']);
                console.log(`Value of fileExists=${fileExists}`)
                if (fileExists === true) {
                    // If we have the larger version of the image then show it by setting its width to 100% first
                    let largerImg = tmpMsgImgClone.querySelector("img[data-temp-id='img']");
                    largerImg.style = "visibility: visible;"; // default is invisible
                    // whatsappweb had src="blob:http://path2img" no extension
                    largerImg.src = "/static/" + msg['media_file_path'];
                }
            }

            // get time 
            msgDateTime = epoch2DateTime(msg['timestamp']);
            tmpMsgImgClone.querySelector("span[data-temp-id='time']").innerText = `${msgDateTime['hrs']}:${msgDateTime['mins']} ${msgDateTime['ampm']}`;

            const ifty = tmpMsgSysClone.querySelector(".ifty");
            ifty.prepend(tmpMsgImgClone);
            // Check if its a forwarded message
            if (msg['is_msg_forwarded']) {
                // clone forwarded template
                let tmpMsgForw = document.querySelector("#forwarded").content.cloneNode(true);
                ifty.prepend(tmpMsgForw); // we can use prepend again to add it before image
            }
            // Finishing up for system messages
            divAllMsgs.appendChild(tmpMsgSysClone);

        } else if (msg['message_type'] == 7) {
            // Prepare the system message template
            const tmpMsgSysClone = tmpMsgSys.content.cloneNode(true);
            // Lets center the msg
            tmpMsgSysClone.querySelector("div[data-temp-id='main']").classList.add("flx-row-center");

            // things will be added to ifty so why not make it global-ish
            const ifty = tmpMsgSysClone.querySelector(".ifty");
            // add padding 0.4 rem
            ifty.setAttribute("style", "padding: 0.4rem;");
            if (msg['msg_sys_action_type'] == 27) {
                let msgToAppend = (msg['from_me'] == 1) ? "You" : msg['wa_display_name'];
                msgToAppend += " changed the group description.";
                // clone template msg-sys-default
                const tmpMsgSysDefault = document.querySelector("#msg-sys-default").content.cloneNode(true);
                // Appendthe default message type template to main msg-sys template at the beginning (using prepend)
                ifty.classList.add("bg-color-white");
                ifty.prepend(tmpMsgSysDefault);
                // Now we can grab span from template type msg-sys-default
                tmpMsgSysClone.querySelector("span[data-temp-id='msg-sys-text']").innerText = msgToAppend;

            } else if (msg['msg_sys_action_type'] == 67) {
                // clone template msg-sys-end-2-end-enc
                const tmpMsgSysE2E = document.querySelector("#msg-sys-end-2-end-enc").content.cloneNode(true);
                // Appendthe enc message type template to main msg-sys template at the beginning (using prepend)
                ifty.classList.add("bg-clr-notf-e2e");
                ifty.prepend(tmpMsgSysE2E);
            } else if (msg['msg_sys_action_type'] == 11) {
                let msgToAppend = (msg['from_me'] == 1) ? "You" : msg['wa_display_name'];
                msgToAppend += " created this group.";
                // clone template msg-sys-end-2-end-enc
                const tmpMsgSysDefault = document.querySelector("#msg-sys-default").content.cloneNode(true);
                // Appendthe enc message type template to main msg-sys template at the beginning (using prepend)
                ifty.classList.add("bg-color-white");
                ifty.prepend(tmpMsgSysDefault);
                tmpMsgSysClone.querySelector("span[data-temp-id='msg-sys-text']").innerText = msgToAppend;
            } else if (msg['msg_sys_action_type'] == 6) {
                let msgToAppend = (msg['from_me'] == 1) ? "You" : msg['wa_display_name'];
                msgToAppend += " changed this group's icon.";
                // clone template msg-sys-end-2-end-enc
                const tmpMsgSysDefault = document.querySelector("#msg-sys-default").content.cloneNode(true);
                // Appendthe enc message type template to main msg-sys template at the beginning (using prepend)
                ifty.classList.add("bg-color-white");
                ifty.prepend(tmpMsgSysDefault);
                tmpMsgSysClone.querySelector("span[data-temp-id='msg-sys-text']").innerText = msgToAppend;
            }
            // Finishing up for system messages
            divAllMsgs.appendChild(tmpMsgSysClone);

        }
        // IMPORTANT set current msg as lastMsg which will be used to compare with msg in the next iteration
        lastMsg = msg;
    }
}

async function getChatMsgs(chat_id, from_limit = 0, limit = 50) {
    url = `/chat/${chat_id}?limit_from=${from_limit}&limit=${limit}`;
    console.log("URL: " + url);
    const response = await fetch(url);
    if (!response.ok) {
        const message = `An error has occured: ${response.status}`;
        throw new Error(message);
    }
    const msgJson = await response.json();
    if (msgJson.length <= 0) {
        console.log("msgJson.length: " + msgJson.length);
        return "NO_MORE_MSGS";
    }

    return msgJson;
}