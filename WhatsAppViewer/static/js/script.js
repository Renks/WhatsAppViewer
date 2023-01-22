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
async function spinnerCallBack() {
    console.log("callback called");
    const msgs = await getChatMsgs(chatId, chatListMsgsLoadedCounter, CHATLISTMSGLIMIT);
    await handleMsgs(msgs);
    divAllMsgs.removeChild(spinner);
    divAllMsgs.appendChild(spinner);
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
    // Getting only date in DD/MM/YYYY format
    const date2 = ('0' + date.getDate()).slice(-2);
    const month2 = ('0' + (date.getMonth() + 1)).slice(-2);
    const year2 = date.getFullYear();
    return {
        'date': date,
        'hrs': hours,
        'mins': minutes,
        'secs': seconds,
        'ampm': ampm,
        'dateNoTime': `${date2}/${month2}/${year2}`
    };
}
const doesFileExist = async (urlToFile) => {
    const response = await fetch(urlToFile);
    console.log(`doesFileExist("${urlToFile}") response.status: ${response.status !== 404}`);
    return (response.status === 200) ? true : false;
}
const fancyTimeFormat = (duration) => {
    // Hours, minutes and seconds
    var hrs = ~~(duration / 3600);
    var mins = ~~((duration % 3600) / 60);
    var secs = ~~duration % 60;

    // Output like "1:01" or "4:03:59" or "123:03:59"
    var ret = "";

    if (hrs > 0) {
        ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
    }

    ret += "" + mins + ":" + (secs < 10 ? "0" : "");
    ret += "" + secs;
    return ret;
}
//blobToBase64
function blobToBase64(blob) {
    return new Promise((resolve, _) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}

// Get file type from url
async function getFileFromUrl(url, name, defaultType = 'image/jpeg') {
    const response = await fetch(url);
    const data = await response.blob();
    return new File([data], name, {
        type: data.type || defaultType,
    });
}

// Get thumbnail from video file
const getVideoCover = async (url, seekTo = 0.0) => {
    const file = await getFileFromUrl(url, 'example.mp4', 'video/mp4');
    console.log("getting video cover for file: ", file);
    return new Promise((resolve, reject) => {
        // load the file to a video player
        const videoPlayer = document.createElement('video');
        videoPlayer.setAttribute('src', URL.createObjectURL(file));
        videoPlayer.load();
        videoPlayer.addEventListener('error', (ex) => {
            reject("error when loading video file", ex);
        });
        // load metadata of the video to get video duration and dimensions
        videoPlayer.addEventListener('loadedmetadata', () => {
            // seek to user defined timestamp (in seconds) if possible
            if (videoPlayer.duration < seekTo) {
                reject("video is too short.");
                return;
            }
            // delay seeking or else 'seeked' event won't fire on Safari
            setTimeout(() => {
                videoPlayer.currentTime = seekTo;
            }, 200);
            // extract video thumbnail once seeking is complete
            videoPlayer.addEventListener('seeked', () => {
                console.log('video is now paused at %ss.', seekTo);
                // define a canvas to have the same dimension as the video
                const canvas = document.createElement("canvas");
                canvas.width = videoPlayer.videoWidth;
                canvas.height = videoPlayer.videoHeight;
                // draw the video frame to canvas
                const ctx = canvas.getContext("2d");
                ctx.drawImage(videoPlayer, 0, 0, canvas.width, canvas.height);
                // return the canvas image as a blob
                ctx.canvas.toBlob(
                    blob => {
                        resolve(blob);
                    },
                    "image/jpeg",
                    0.75 /* quality */
                );
            });
        });
    });
}

const getExtensionFromFileName = (mime_type = "filename.txt",splitter=".") => {
    return mime_type.substring(mime_type.lastIndexOf(splitter) + 1, mime_type.length).toUpperCase();
};


/**
 * Format bytes as human-readable text.
 * 
 * @param bytes Number of bytes.
 * @param si True to use metric (SI) units, aka powers of 1000. False to use 
 *           binary (IEC), aka powers of 1024.
 * @param dp Number of decimal places to display.
 * 
 * @return Formatted string.
 */
 function humanFileSize(bytes, si=false, dp=1) {
    const thresh = si ? 1000 : 1024;
  
    if (Math.abs(bytes) < thresh) {
      return bytes + ' B';
    }
  
    const units = si 
      ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] 
      : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    let u = -1;
    const r = 10**dp;
  
    do {
      bytes /= thresh;
      ++u;
    } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);
  
  
    return bytes.toFixed(dp) + ' ' + units[u];
  }


const loadChat = async (chat_div) => {
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
    const msgs = await getChatMsgs(chatId, chatListMsgsLoadedCounter, CHATLISTMSGLIMIT);
    await handleMsgs(msgs, true);
    divAllMsgs.appendChild(spinner);
    chatListMsgsLoadedCounter += CHATLISTMSGLIMIT;
    // Intersection observer should observe spinner here
    spinnerObserver.observe(spinner);
}

async function handleMsgs(data, firstTime = false) {
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
    let lastMsg = {
        'dateNoTime': new Date() // will be used to compare if we should print date above msgs
    };
    let lastMsgDateDiv = '<div></div>';

    // load messages
    for (msg of data) {
        // Add date notification text if current msg's date is different than the lastMsg
        const msgDateTime = epoch2DateTime(msg['timestamp']);
        // Date message should be appeneded at the end so scroll below near the end

        const tmpMsgTxtClone = tmpMsgTxt.content.cloneNode(true);
        const tmpMsgTxtCloneMain = tmpMsgTxtClone.querySelector("div[data-temp-id='main']");
        const tmpMsgTxtCloneIfty = tmpMsgTxtClone.querySelector(".ifty");
        const tmpMsgTxtCloneApp = tmpMsgTxtClone.querySelector("div[data-temp-id='append-here']");
        // INTIALIZING templateClone default attributes
        tmpMsgTxtCloneMain.setAttribute("msgid", msg['_id']);
        tmpMsgTxtCloneMain.setAttribute("msgchatrowid", msg['chat_row_id']);
        tmpMsgTxtCloneMain.setAttribute("msgkeyid", msg['key_id']);
        tmpMsgTxtCloneMain.setAttribute("msgjidrawstring", msg['jid_raw_string']);
        tmpMsgTxtCloneMain.setAttribute("displayName", msg['wa_display_name']);
        tmpMsgTxtCloneMain.setAttribute("timesent", msg['timestamp']);

        // need to add marg-bottom-2px if the current msg has same sender as the previous one
        if (msg['sender_jid_row_id'] == lastMsg['sender_jid_row_id'] && msg['message_type'] != 7) {
            // If the current msg has the same sender as the last msg
            // and is not a system message then add margin bottom 2 class
            tmpMsgTxtCloneMain.classList.add("marg-bottom-2px");
            // Otherwise margin-bottom is 12px by default
        }
        if (msg['from_me'] == 1) {
            tmpMsgTxtCloneMain.classList.add("message-out");
        } else {
            tmpMsgTxtCloneMain.classList.add("message-in");
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
        tmpMsgTxtClone.querySelector("span[data-temp-id='msg-time']").innerText = `${msgDateTime['hrs']}:${msgDateTime['mins']} ${msgDateTime['ampm']}`;
        if (msg['message_type'] == 0) {
            // If current message is a text and is a reply to some other message — append the reply template to the current msg template
            if (msg['lookup_tables'] == 2) {
                // Current message has "reply to message" attached with it
                // Now "reply to message" can come in all shapes and forms
                // for example it could be an image,video,location,doc etc
                // So all the for "reply to message" type goes here
                tmpMsgTxtCloneApp.prepend(tmpMsgTxtReply.content.cloneNode(true));
                // Correcting sender name
                // console.log(msg);
                // tmpMsgTxtClone.querySelector("span[data-temp-id='sender-name']").innerText = document.querySelector("#profile-name").innerText;
                // if msg.from_me then sender = You else if theres a quoted_sender_user
                const msg_sender = (msg['message_quoted_from_me']) ? "You" : ((msg['message_quoted_sender_user']) ? msg['message_quoted_sender_user'] : document.querySelector("#profile-name").innerText);
                tmpMsgTxtClone.querySelector("span[data-temp-id='sender-name']").innerText = msg_sender;
                const tmpMsgSenderTxt = tmpMsgTxtClone.querySelector("span[data-temp-id='sender-text']");
                if (msg['message_quoted_message_type'] == 0) {
                    tmpMsgSenderTxt.innerText = msg['message_quoted_text_data'];
                } else if (msg['message_quoted_message_type'] == 1) {
                    // enable photo icon in reply template
                    tmpMsgTxtClone.querySelector("div[data-temp-id='is-reply-to-img-ico']").style = "display:inline-block;";
                    // enable photo thumb in reply template
                    tmpMsgTxtClone.querySelector("div[data-temp-id='is-reply-to-img-thumb']").style = "display:block;";
                    // Set Text to photo
                    tmpMsgSenderTxt.innerText = "Photo";
                    // Set thumb div url to base64 img
                    tmpMsgTxtClone.querySelector("div[data-temp-id='reply-img-thumb-bg-url']").style = `
                    background-image: url('data:image/jpeg;base64,${msg['thumbnail']}');"
                    `;
                    // Set thumb big url to base64 img
                    if (doesFileExist('/static/' + msg['media_quoted_file_path'])) {

                        tmpMsgTxtClone.querySelector("div[data-temp-id='reply-img-bg-url']").style = `
                        background-image: url('/static/${msg['media_quoted_file_path']}');"
                    `;
                    }
                } else if (msg['message_quoted_message_type'] == 2) {
                    tmpMsgSenderTxt.innerText = "[Audio]";
                } else if (msg['message_quoted_message_type'] == 3) {
                    tmpMsgSenderTxt.innerText = "[Video]";

                } else if (msg['message_quoted_message_type'] == 4) {
                    tmpMsgSenderTxt.innerText = "[Contact]";
                } else if (msg['message_quoted_message_type'] == 5) {
                    tmpMsgSenderTxt.innerText = "[Location]";
                } else if (msg['message_quoted_message_type'] == 7) {
                    tmpMsgSenderTxt.innerText = "[System Message]";
                } else if (msg['message_quoted_message_type'] == 9) {
                    tmpMsgSenderTxt.innerText = "[Doc]";
                } else {
                    tmpMsgSenderTxt.innerText = "[Unkown]";
                }
            } else if (msg['is_msg_forwarded']) {
                // Cloning the span parent instead of the whole forwarded template coz thats how it is in the web version
                let tmpMsgForw = document.querySelector("#forwarded").content.cloneNode(true);
                let tmpMsgForwOuterDiv = tmpMsgForw.querySelector("div[data-temp-id='forwarded-div-outer']");
                // Need to remove all classes from the outer div and marg class
                tmpMsgForwOuterDiv.setAttribute("class", "marg-l-n-2px");
                tmpMsgTxtCloneApp.prepend(tmpMsgForwOuterDiv);
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
                if (msg['recipient_count'] > 0) {
                    // recipient_count seems like a nice way to know if its group message
                    tmpMsgImgClone.querySelector("span[data-temp-id='msg-dblcheck']").classList.remove("clr-icon-ack");
                } else {
                    // NOT A GROUP CHAT MSG - REMOVE DOUBLE TICK SUPPORT
                    tmpMsgImgClone.querySelector("div[data-testid='msg-meta']").removeChild(tmpMsgImgClone.querySelector("div[data-temp-id='msg-dblcheck-div']"));
                }
            }
            // If the image has caption
            if (msg['text_data']) {
                // display the caption div
                tmpMsgImgClone.querySelector("div[data-temp-id='img-caption-div']").style = "display:block;";
                tmpMsgImgClone.querySelector("span[data-temp-id='img-caption']").innerText = msg['text_data'];
                // Remove the white color class from time div
                tmpMsgImgClone.querySelector("div[data-testid='msg-meta']").classList.remove("clr-white");
                // Add the black color class to time div
                tmpMsgImgClone.querySelector("div[data-testid='msg-meta']").classList.add("clr-bubble-meta");

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
                const fileExists = await doesFileExist("/static/" + msg['media_file_path']);
                // console.log(`Value of fileExists=${fileExists}`)
                if (fileExists === true) {
                    // If we have the larger version of the image then show it by setting its width to 100% first
                    let largerImg = tmpMsgImgClone.querySelector("img[data-temp-id='img']");
                    largerImg.style = "visibility: visible;"; // default is invisible
                    // whatsappweb had src="blob:http://path2img" no extension
                    largerImg.src = "/static/" + msg['media_file_path'];
                }
            }

            // get time 
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

        } else if (msg['message_type'] == 2) {
            // Add text data
            if (msg['media_media_name']) {
                tmpMsgTxtClone.querySelector("span[data-temp-id='my-text']").innerText = `
                ${msg['media_media_name']}
                `;
            }
            if (msg['media_file_path']) {
                const fileExists = await doesFileExist("/static/" + msg['media_file_path']);
                if (fileExists) {
                    // Change pointer to cursor of main
                    tmpMsgTxtCloneMain.classList.add("cur-point");
                    tmpMsgTxtCloneMain.setAttribute("onclick", `window.open('/static/${msg['media_file_path']}')`);
                }
            }
            // Audio message — append the audio logo & audio file name to normal text message
            tmpMsgTxtCloneApp.appendChild(
                document.querySelector("#audio-regular").content.cloneNode(true)
            );
            divAllMsgs.appendChild(tmpMsgTxtClone);

        } else if (msg['message_type'] == 3) {

            // empty normal text msg template's msg-container
            tmpMsgTxtCloneMain.querySelector("#msg-container").innerHTML = "";
            // clone vid template and append it to msg container
            const tmpVidCon = document.querySelector("#vid-regular").content.cloneNode(true);
            // if the vid exists locally set onclick to location
            if (msg['media_file_path']) {
                const fileExists = await doesFileExist("/static/" + msg['media_file_path']);
                if (fileExists) {
                    tmpMsgTxtCloneMain.setAttribute("onclick", `window.open('/static/${msg['media_file_path']}')`);
                    try {
                        // get the frame at 1.5 seconds of the video file
                        const coverBlob = await getVideoCover("/static/" + msg['media_file_path']);
                        const resposne = await blobToBase64(coverBlob);
                        tmpVidCon.querySelector("div[data-temp-id='vid-regular-url']").style = `
                        background-image: url('${resposne}'); width: 100%;
                        `;

                    } catch (ex) {
                        console.log("ERROR: ", ex);
                    }
                }
            } else {
                // If there is no path then set the vid thumbnail to blur
                tmpVidCon.querySelector("div[data-temp-id='vid-regular-url']").classList.add("img-thumb-blur");
                // Offer to download ?

                // Set default thumb

                tmpVidCon.querySelector("div[data-temp-id='vid-regular-url']").style = `
                background-image: url('data:image/jpeg;base64,${msg['thumbnail']}'); width: 100%;
                `;
            }
            tmpVidCon.querySelector("span[data-temp-id='vid-regular-duration']").innerText = fancyTimeFormat(msg['media_media_duration']);
            // if there is a caption
            if (msg['text_data']) {
                tmpVidCon.querySelector("div[data-temp-id='vid-regular-caption']").style = "display:block";
                tmpVidCon.querySelector("span[data-temp-id='vid-regular-caption-text']").innerText = msg["text_data"];
                // Set time color to bubble meta
                tmpVidCon.querySelector("div[data-testid='msg-meta']").classList.remove("clr-inverse");
                tmpVidCon.querySelector("div[data-testid='msg-meta']").classList.add("clr-bubble-meta");
            }
            // Remove double tick
            if (!msg['from_me']) {
                if (msg['recipient_count'] > 0) {
                    // recipient_count seems like a nice way to know if its group message
                    tmpVidCon.querySelector("span[data-temp-id='msg-dblcheck']").classList.remove("clr-icon-ack");
                } else {
                    // NOT A GROUP CHAT MSG - REMOVE DOUBLE TICK SUPPORT
                    tmpVidCon.querySelector("div[data-testid='msg-meta']").removeChild(tmpVidCon.querySelector("div[data-temp-id='msg-dblcheck-div']"))
                }
            }


            // setting time
            tmpVidCon.querySelector("span[data-temp-id='time']").innerText = `${msgDateTime['hrs']}:${msgDateTime['mins']} ${msgDateTime['ampm']}`;

            tmpMsgTxtCloneMain.querySelector("#msg-container").appendChild(tmpVidCon);

            // Finally adding the video to main messages
            divAllMsgs.appendChild(tmpMsgTxtClone);

        } else if (msg['message_type'] == 4) {

        } else if (msg['message_type'] == 5) {

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

        } else if (msg['message_type'] == 9) {
            // Doc
            // Set default width of msg-container so that its the same for all docs
            tmpMsgTxtCloneMain.querySelector("#msg-container").style = `
                width: 340px;
            `;

            // clone the doc-regular template
            const tmpMsgDocClone = document.querySelector("#doc-regular").content.cloneNode(true);
            // Changing doc stuff
            // If the media is outgoing then replace bg-clr-outgoing with incoming
            if(msg["from_me"]){
                // Remove incoming class
                tmpMsgDocClone.querySelector("div[data-temp-id='doc-background']")
                .classList.remove("bg-clr-in-deeper");
                // Add outgoing class
                tmpMsgDocClone.querySelector("div[data-temp-id='doc-background']")
                .classList.add("bg-clr-out-deeper");
            }

            // Media name — cutting if too long
            tmpMsgDocClone.querySelector("span[data-temp-id='doc-name']").innerText = 
            (msg["media_media_name"].length>30)?msg["media_media_name"].substring(0,30)+"...":msg["media_media_name"];
            ;
            // If file exists add onclick event to download button
            if (msg['media_file_path']) {
                const fileExists = await doesFileExist("/static/" + msg['media_file_path']);
                if (fileExists) {
                    tmpMsgDocClone
                    .querySelector("div[data-temp-id='doc-download']")
                    .setAttribute("onclick", `window.open('/static/${msg['media_file_path']}')`);
                }
            }
            // Offer to download if file doesn't exist locally?

            // Adding Extension
            tmpMsgDocClone.querySelector("span[data-temp-id='doc-type']").innerText = getExtensionFromFileName(msg["text_data"]);
            // Adding File Size
            tmpMsgDocClone.querySelector("span[data-temp-id='doc-file-size']")
                .innerText = humanFileSize(msg['media_file_size'],true);
            // Time sent/read
            tmpMsgDocClone.querySelector("span[data-temp-id='msg-time']").innerText = `${msgDateTime['hrs']}:${msgDateTime['mins']} ${msgDateTime['ampm']}`;


            // Removing Blue double tick if its group chat and message wasn't from me
            if (msg['recipient_count'] > 0) {
                // recipient_count seems like a nice way to know if its group message
                tmpMsgDocClone.querySelector("span[data-temp-id='msg-dblcheck']").classList.remove("clr-icon-ack");
            } else {
                // NOT A GROUP CHAT MSG - REMOVE DOUBLE TICK SUPPORT
                tmpMsgDocClone.querySelector("div[data-testid='msg-meta']").removeChild(tmpMsgDocClone.querySelector("div[data-temp-id='msg-dblcheck-div']"))
            }

            // Append to all messages
            // Need to clear the ifty and then append the doc template
            tmpMsgTxtCloneIfty.innerHTML = "";
            tmpMsgTxtCloneIfty.appendChild(tmpMsgDocClone);
            divAllMsgs.appendChild(tmpMsgTxtClone);

        } else if (msg['message_type'] == 10) {
            // Prepare the system message template
            const tmpMsgSysClone = tmpMsgSys.content.cloneNode(true);
            // Lets center the msg
            tmpMsgSysClone.querySelector("div[data-temp-id='main']").classList.add("flx-row-center");

            // things will be added to ifty so why not make it global-ish
            const ifty = tmpMsgSysClone.querySelector(".ifty");
            // add padding 0.4 rem
            ifty.setAttribute("style", "padding: 0.4rem;");
            const msgTime = epoch2DateTime(msg['timestamp']);
            const msgToAppend = `Missed voice call at ${msgTime.hrs}:${msgTime.mins} ${msgTime.ampm}`;
            // clone template missed-call
            const tmpMsgMissedCall = document.querySelector("#msg-missed-call").content.cloneNode(true);
            tmpMsgMissedCall.querySelector("span[data-temp-id='missed-call-text']").innerText = msgToAppend;

            // Appendthe default message type template to main msg-sys template at the beginning (using prepend)
            ifty.classList.add("bg-color-white");
            ifty.prepend(tmpMsgMissedCall);
            // Now we can grab span from template type msg-sys-default
            // Finishing up for system messages
            divAllMsgs.appendChild(tmpMsgSysClone);

        } else if (msg['message_type'] == 15) {

        } else if (msg['message_type'] == 16) {

        }



        // ADDING DATE MSG - MUST BE APPENDED AFTER REGULAR MSG
        if (msgDateTime.dateNoTime != lastMsg.dateNoTime) {
            // Prepare the system message template
            const tmpMsgSysClone = tmpMsgSys.content.cloneNode(true);
            // Lets center the msg
            tmpMsgSysClone.querySelector("div[data-temp-id='main']").classList.add("flx-row-center");
            // things will be added to ifty so why not make it global-ish
            const ifty = tmpMsgSysClone.querySelector(".ifty");
            // add padding 0.4 rem
            ifty.setAttribute("style", "padding: 0.4rem;");
            const msgToAppend = `${msgDateTime.dateNoTime}`;
            // clone template msg-sys-default
            const tmpMsgSysDefault = document.querySelector("#msg-sys-default").content.cloneNode(true);
            // Appendthe default message type template to main msg-sys template at the beginning (using prepend)
            ifty.classList.add("bg-color-white");
            ifty.prepend(tmpMsgSysDefault);
            // Now we can grab span from template type msg-sys-default
            tmpMsgSysClone.querySelector("span[data-temp-id='msg-sys-text']").innerText = msgToAppend;

            // So we can move it up the dom if the next msg has the same date
            lastMsgDateDiv = tmpMsgSysClone.querySelector("div[data-temp-id='main']");
            // Finishing up for system messages
            divAllMsgs.appendChild(tmpMsgSysClone);
        } else {
            divAllMsgs.removeChild(lastMsgDateDiv);
            divAllMsgs.appendChild(lastMsgDateDiv);

        }

        // IMPORTANT set current msg as lastMsg which will be used to compare with msg in the next iteration
        lastMsg = msg;
        lastMsg.dateNoTime = msgDateTime.dateNoTime;
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


// Wait for doc to load and then listen for click even on chats
document.addEventListener('DOMContentLoaded', async () => {
    const allChats = document.querySelectorAll("div[typeof='chat']");
    allChats.forEach(chat => {
        chat.onclick = (e) => {
            console.log(chat);
            loadChat(chat);
        };
    });
});



