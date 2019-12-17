/* jshint esversion: 6 */
var api = (function(){
    "use strict";

    let _refreshGallery = false;
    let _refreshGalleries = false;

    function sendFiles(method, url, data, callback){
        let formdata = new FormData();
        Object.keys(data).forEach(function(key){
            let value = data[key];
            formdata.append(key, value);
        });
        let xhr = new XMLHttpRequest();
        xhr.onload = function() {
            if (xhr.status !== 200) callback("[" + xhr.status + "]" + xhr.responseText, null);
            else callback(null, JSON.parse(xhr.responseText));
        };
        xhr.open(method, url, true);
        xhr.send(formdata);
    }

    function send(method, url, data, callback){
        let xhr = new XMLHttpRequest();
        xhr.onload = function() {
            if (xhr.status !== 200) callback("[" + xhr.status + "]" + xhr.responseText, null);
            else callback(null, JSON.parse(xhr.responseText));
        };
        xhr.open(method, url, true);
        if (!data) xhr.send();
        else{
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(data));
        }
    }

    var module = {};

    module.getUsername = function(){
        return document.cookie.replace(/(?:(?:^|.*;\s*)username\s*\=\s*([^;]*).*$)|^.*$/, "$1");
    };

    module.signup = function(username, password){
        let user = {
            username: username,
            password: password
        };

        send('POST', '/signup/', user, function(err, res) {
            if (err) notifyErrorListeners(err);
            else notifyUserListeners(module.getUsername());
        });
    };

    module.signin = function(username, password){
        let user = {
            username: username,
            password: password
        };
        send('POST', '/signin/', user, function(err, res) {
            if (err) notifyErrorListeners(err);
            else notifyUserListeners(module.getUsername());
        });
    };

    module.getUsers = function(callback) {
        send('GET', `/api/users/?page=${getPage()}`, null, function(err, res) {
            if (err) notifyErrorListeners(err);
            else callback(res);
        });
    };

    module.getUserCount = function(callback) {
        send('GET', `/api/users/count`, null, function(err, res) {
            if (err) notifyErrorListeners(err);
            else callback(res);
        });
    };

    module.addImage = function(title, file){
        let image = {
            author: module.getCookieV('username'),
            title: title,
            file: file
        };
        sendFiles('POST', '/api/images/', image, function(err, res) {
            if (err) notifyErrorListeners(err);
            else notifyImageListeners();
        });
    };

    module.deleteImage = function(imageId){
        send('DELETE', `/api/images/${imageId}`, null, function(err, res) {
            if (err) notifyErrorListeners(err);
            else notifyImageListeners();
        });
    };

    module.getImage = function(imageId, callback){
        send('GET', `/api/images/${imageId}`, null, function(err, res) {
            if (err) notifyErrorListeners(err);
            else callback(res);
        });
    };

    module.getNextImage = function(image, callback){
        let createdAt = encodeURI(image.createdAt);
        let selectedGallery = module.getCookieV('gallery');
        send('GET', `/api/images/?username=${selectedGallery}&createdAt=gt:${createdAt}&sort=createdAt.asc&limit=1`, null, function(err, res) {
            if (err) notifyErrorListeners(err);
            else callback(res);
        });
    };

    module.getPrevImage = function(image, callback){
        let createdAt = encodeURI(image.createdAt);
        let selectedGallery = module.getCookieV('gallery');
        send('GET', `/api/images/?username=${selectedGallery}&createdAt=lt:${createdAt}&sort=createdAt.desc&limit=1`, null, function(err, res) {
            if (err) notifyErrorListeners(err);
            else callback(res);
        });
    };

    module.getLatestImage = function(callback){
        let selectedGallery = module.getCookieV('gallery');
        send('GET', `/api/images/?username=${selectedGallery}&sort=createdAt.desc&limit=1`, null, function(err, res) {
            if (err) notifyErrorListeners(err);
            else callback(res);
        });
    };

    module.addComment = function(content){
        let comment = {
            imageId: module.getCookieV('image'),
            content: content
        };
        send('POST', '/api/comments/', comment, function(err, res) {
            if (err) notifyErrorListeners(err);
            else notifyCommentListeners(res.imageId);
        });
    };

    module.deleteComment = function(commentId){
        send('DELETE', `/api/comments/${commentId}`, null, function(err, res) {
            if (err) notifyErrorListeners(err);
            else notifyCommentListeners(res.imageId);
        });
    };

    module.getComments = function(imageId, callback){
        send('GET', `/api/comments/?imageId=${imageId}&sort=createdAt.desc`, null, function(err, res) {
            if (err) notifyErrorListeners(err);
            else callback(res);
        });
    };

    let userListeners = [];

    module.onUserUpdate = function(listener){
        userListeners.push(listener);
    };

    function notifyUserListeners(username) {
        userListeners.forEach(function(listener) {
            listener(username);
        });
    }

    let imageListeners = [];

    module.onImageUpdate = function(listener){
        imageListeners.push(listener);
    };

    function notifyImageListeners(img){
        imageListeners.forEach(function(listener) {
            listener();
        });
    }

    let commentListeners = [];

    module.onCommentUpdate = function(listener){
        commentListeners.push(listener);
    };

    function notifyCommentListeners(imageId) {
        commentListeners.forEach(function(listener) {
            listener(imageId);
        });
    }

    let errorListeners = [];

    module.onError = function(listener){
        errorListeners.push(listener);
    };

    function notifyErrorListeners(err){
        errorListeners.forEach(function(listener){
            listener(err);
        });
    }

    module.setCookieKV = function(key, value) {
        document.cookie = `${key}=${value}`;
        //let cookies = document.cookie.split(';');
        //let newCookiesMap = {};
        //let newCookies = '';
        //let currKey, currValue;
        //for (let i = 0; i < cookies.length; i++) {
        //    currKey = cookies[i].split('=')[0];
        //    currValue = cookies[i].split('=')[1];
        //    newCookiesMap[currKey] = currValue;
        //}
        //// upsert
        //newCookiesMap[key] = value;

        //let keys = Object.keys(newCookiesMap);
        //for (let j = 0; j < keys.length; j++) {
        //    currKey = keys[j];
        //    if (newCookies == '')
        //        newCookies = `${currKey}=${newCookiesMap[currKey]}`;
        //    else
        //        newCookies += `;${currKey}=${newCookiesMap[currKey]}`;
        //}
        //document.cookie = newCookies;
    };

    module.delCookieK = function(key) {
        document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        //let cookies = document.cookie.split(';');
        //let newCookiesMap = {};
        //let newCookies = '';
        //let currKey, currValue;
        //for (let i = 0; i < cookies.length; i++) {
        //    currKey = cookies[i].split('=')[0];
        //    currValue = cookies[i].split('=')[1];
        //    if (currKey != key)
        //        newCookiesMap[currKey] = currValue;
        //}

        //let keys = Object.keys(newCookiesMap);
        //for (let j = 0; j < keys.length; j++) {
        //    currKey = keys[j];
        //    if (newCookies == '')
        //        newCookies = `${currKey}=${newCookiesMap[currKey]}`;
        //    else
        //        newCookies += `;${currKey}=${newCookiesMap[currKey]}`;
        //}
        //document.cookie = newCookies;
    };

    module.getCookieV = function(key) {
        let cookies = document.cookie.split('; ');
        let currKey, currValue;
        for (let i = 0; i < cookies.length; i++) {
            currKey = cookies[i].split('=')[0];
            currValue = cookies[i].split('=')[1];
            if (currKey == key)
                return currValue;
        }
        return '';
    };

    module.getCurrentGallery = function(username) {
        return module.getCookieV('gallery');
    };

    module.refreshGalleries = function() {
        _refreshGalleries = true;
        _refreshGallery = false;
    };

    let galleriesCallback = function() {};

    module.onGalleriesRefresh = function(callback) {
        galleriesCallback = callback;
    };

    module.refreshGallery = function() {
        _refreshGalleries = false;
        _refreshGallery = true;
    };

    module.noRefresh = function() {
        _refreshGalleries = false;
        _refreshGallery = false;
    };

    function getPage() {
        return module.getCookieV('page') || 1;
    }

    (function refresh(){
        setTimeout(function(e){
            if (_refreshGallery) {
                let selectedGallery = module.getCookieV('gallery');
                let selectedImage = module.getCookieV('image');
                /* check on the current image */
                if (selectedImage != '') {
                    send('GET', `/api/images/${selectedImage}`, null, function(err, res) {
                        console.log(err);
                        console.log(res);
                        /* error with current img, notify */
                        if (err) notifyImageListeners();
                        /* refresh comments */
                        else notifyCommentListeners(selectedImage);
                    });
                } else {
                    /* triggers a search for a new image */
                    notifyImageListeners();
                }
            }

            if (_refreshGalleries) {
                module.getUsers(galleriesCallback);
            }
            refresh();
        }, 2000);
    }());

    return module;
})();
