/*jshint esversion: 6*/
(function(){

    'use strict';

    function signInMode() {
        api.noRefresh();
        let signoutBox = document.getElementById('signout-box');
        if (signoutBox)
            signoutBox.parentNode.removeChild(signoutBox);

        let signinSection = document.createElement('div');
        signinSection.id = 'signin-section';
        signinSection.classList.add('section', 'section-row');
        signinSection.innerHTML = `
            <form id="signin-form">
                <div>
                    <label for="signin-username">Username</label>
                    <input id="signin-username" name="username" type="text" required>
                </div>
                <div>
                    <label for="signin-password">Password</label>
                    <input id="signin-password" name="password" type="password" required>
                </div>
                <div class='row'>
                    <button id="signin" name="action" class="btn btn-green">Sign In</button>
                    <button id="signup" name="action" class="btn btn-blue">Sign Up</button>
                </div>
            </form>
        `;

        function submit(){
            if (document.querySelector('#signin-form').checkValidity()){
                let username = document.querySelector('#signin-form [name=username]').value;
                let password = document.querySelector('#signin-form [name=password]').value;
                let action = document.querySelector('#signin-form [name=action]').value;
                document.querySelector('#signin-form').reset();
                api[action](username, password, function(err){
                    if (err) {
                        document.querySelector('#error_box').innerHTML = err;
                    }
                });
            }
        }

        signinSection.querySelector('#signin-form').onsubmit = function(e) {
            e.preventDefault();
        };

        signinSection.querySelector('#signin').addEventListener('click', function(e){
            e.preventDefault();
            document.getElementById('error_box').innerHTML = '';
            document.querySelector('form [name=action]').value = 'signin';
            submit();
        });

        signinSection.querySelector('#signup').addEventListener('click', function(e){
            e.preventDefault();
            document.getElementById('error_box').innerHTML = '';
            document.querySelector('form [name=action]').value = 'signup';
            submit();
        });
        document.getElementById('container').append(signinSection);
    }

    function addSignout() {
        if (!document.getElementById('signout-box'))
            document.body.innerHTML = `
                    <div id="signout-box" class="section-row-start section-borderless">
                        <a id="signout" href="/signout/">Sign Out :: ${api.getCookieV('username')}</a>
                    </div>
                    ` + document.body.innerHTML;
    }

    function populateGalleries(users) {
        let galleries = document.getElementById('galleries');
        let newGalleries = document.createElement('div');
        newGalleries.id = 'galleries';
        newGalleries.className = 'items section';
        newGalleries.innerHTML = `
            <div class="section-header">
                <h4>Galleries</h4>
            </div>
            <div class="line"></div>
        `;
        let i = 0;
        if (users == null || users.length == 0)
            galleries.replaceWith(newGalleries);
        users.forEach(function(user) {
            i = i + 1;
            /* skip ourselves, we have a button */
            //if (user._id != api.getCookieV('username')) {
            let galleryItem = document.createElement('div');
            galleryItem.class = 'item';
            galleryItem.innerHTML = `
                <div class="item-details">
                    <a class="btn btn-green btn-mini select-item">&gt;</a>
                    <div class="item-author">${user._id}'s Gallery</div>
                    <div class="item-date">Joined on ${(new Date(user.createdAt)).toLocaleString()}</div>
                </div>
            `;
            galleryItem.querySelector('.select-item').onclick = function(e) {
                document.getElementById('error_box').innerHTML = '';
                api.setCookieKV('gallery', user._id);
                galleryMode();
            };
            newGalleries.append(galleryItem);
            //}
            /* check if that was the last item in the async foreach */
            if (i == users.length)
                galleries.replaceWith(newGalleries);
        });

        let pagination = document.createElement('div');
        let pageLink;
        pagination.id = 'pagination';

        let createCallback = function(i) {
            return function(e) {
                    pagination.parentNode.removeChild(pagination);
                    galleriesMode(i + 1);
            };
        };

        api.getUserCount(function(count) {
            let pageCount = Math.floor(count / 5) + (count % 5 != 0 ? 1 : 0);
            for (let i = 0; i < pageCount; i++) {
                pageLink = document.createElement('a');
                if ((i + 1) == api.getCookieV('page'))
                    pageLink.className = 'active';
                pageLink.innerHTML = i + 1;
                pageLink.addEventListener('click', createCallback(i));
                pagination.append(pageLink);
            }
            document.getElementById('pagination').replaceWith(pagination);
        });
    }

    function clearGalleries() {
        let buttonSection = document.getElementById('button-section');
        if (buttonSection)
            buttonSection.parentNode.removeChild(buttonSection);

        let galleriesSection = document.getElementById('galleries-section');
        if (galleriesSection)
            galleriesSection.parentNode.removeChild(galleriesSection);

        let pagination = document.getElementById('pagination');
        if (pagination)
            pagination.parentNode.removeChild(pagination);
    }

    function galleriesMode(page=1) {
        addSignout();
        api.delCookieK('image');
        api.setCookieKV('page', page);
        api.refreshGalleries();
        api.onGalleriesRefresh(populateGalleries);

        let holderButtonSection = document.createElement('div');
        holderButtonSection.id = 'button-section';
        holderButtonSection.classList.add('section', 'section-column', 'section-borderless');
        holderButtonSection.innerHTML = `
                <a id="mygallery-btn" class="btn btn-blue">My Gallery</a>
        `;

        let holderGalleriesSection = document.createElement('div');
        holderGalleriesSection.id = 'galleries-section';
        holderGalleriesSection.classList.add('section', 'section-main', 'section-column');
        holderGalleriesSection.innerHTML = `
                <div id="galleries" class="section"></div>
            `;
        let holderPagination = document.createElement('div');
        holderPagination.id = 'pagination';

        holderButtonSection.querySelector('#mygallery-btn').onclick = function(e) {
            e.preventDefault();
            api.setCookieKV('gallery', api.getCookieV('username'));
            clearGalleries();
            galleryMode();
        };

        let buttonSection = document.getElementById('button-section');
        if (buttonSection)
            buttonSection.replaceWith(holderButtonSection);
        else
            document.getElementById('container').append(holderButtonSection);

        let galleriesSection = document.getElementById('galleries-section');
        if (galleriesSection)
            galleriesSection.replaceWith(holderGalleriesSection);
        else
            document.getElementById('container').append(holderGalleriesSection);

        let pagination = document.getElementById('pagination');
        if (pagination)
            pagination.replaceWith(holderPagination);
        else
            document.getElementById('container').append(holderPagination);

        /* fill the skeleton we just created */
        api.getUsers(populateGalleries);
    }

    function clearGallery() {
        let buttonSection = document.getElementById('button-section');
        let gallerySection = document.getElementById('gallery-section');
        let imgFormSection = document.getElementById('section-img-form');
        if (buttonSection)
            buttonSection.parentNode.removeChild(buttonSection);
        if (gallerySection)
            gallerySection.parentNode.removeChild(gallerySection);
        if (imgFormSection)
            imgFormSection.parentNode.removeChild(imgFormSection);
    }

    function galleryMode() {
        addSignout();
        clearGalleries();
        api.refreshGallery();
        /*
        if (galleriesSection)
            galleriesSection.parentNode.removeChild(galleriesSection);

        let buttonSection = document.getElementById('button-section');
        if (buttonSection)
            buttonSection.parentNode.removeChild(buttonSection);
        */

        let container = document.getElementById('container');
        let gallerySection = document.createElement('div');
        gallerySection.id = 'gallery-section';
        gallerySection.classList.add('section', 'section-main', 'section-column', 'section-borderless');
        let buttonSection = document.createElement('div');
        buttonSection.id = 'button-section';
        buttonSection.classList.add('section', 'section-column', 'section-borderless');
        buttonSection.innerHTML = `
                <a id="back-btn" class="btn btn-red">Back</a>
            `;
        if (api.getCookieV('gallery') == api.getCookieV('username')) {
            buttonSection.innerHTML += `
                <a id="form-toggler" class="btn btn-blue toggler">☰ Image Form</a>
            `;
            let imgFormSection = document.createElement('div');
            imgFormSection.id = 'section-img-form';
            imgFormSection.classList.add('section', 'section-row-center', 'section-borderless');
            imgFormSection.innerHTML = `
                <form id="img-form" action="">
                    <div>
                        <label for="img-title">Title</label>
                        <input id="img-title" name='title' type="text" required>
                    </div>
<!--
                    <div>
                        <label for="img-author">Author</label>
                        <input id="img-author" name='author' type="text" required>
                    </div>
-->
                    <div>
                        <label for="img-file">File</label>
                        <input id="img-file" name='imgfile' type="file" required>
                    </div>
                    <div class="row">
                        <input id="img-submit" class="btn btn-green" type="submit" value="Add to Gallery">
                    </div>
                </form>
            `;
            buttonSection.querySelector('#form-toggler').addEventListener('click', function(e){
                e.preventDefault();
                document.getElementById('section-img-form').classList.toggle('hidden');
            });
            imgFormSection.querySelector('#img-form').addEventListener('submit', function(e){
                e.preventDefault();
                document.getElementById('error_box').innerHTML = '';
                let title = document.getElementById('img-title');
                //let author = document.getElementById('img-author');
                let imgFile = document.getElementById('img-file');
                api.addImage(title.value, imgFile.files[0]);
                //api.addImage(title.value, author.value, imgFile.files[0]);
                document.querySelector('#img-form').reset();
            });
            buttonSection.querySelector('#back-btn').addEventListener('click', function(e){
                e.preventDefault();
                document.getElementById('error_box').innerHTML = '';
                api.delCookieK('gallery');
                clearGallery();
                galleriesMode();
            });
            container.append(buttonSection);
            container.append(imgFormSection);
        } else {
            buttonSection.querySelector('#back-btn').addEventListener('click', function(e){
                e.preventDefault();
                document.getElementById('error_box').innerHTML = '';
                api.delCookieK('gallery');
                galleriesMode();
                gallerySection.parentNode.removeChild(gallerySection);
                buttonSection.parentNode.removeChild(buttonSection);
            });
            container.append(buttonSection);
        }
        container.append(gallerySection);
        api.getLatestImage(renderLatest);
        api.onImageUpdate(function() {
            api.getLatestImage(renderLatest);
        });

        api.onCommentUpdate(function(commentImageId) {
            /* only redraw comments if a changed comment belongs to the current img */
            /* also have to handle the case where the gallery is not rendered (empty db) */
            let galleryImage = document.getElementById('gallery-img');
            if (galleryImage == null)
                return;
            if (commentImageId == api.getCookieV('image'))
                renderComments(commentImageId);
        });
    }


    /* render an image */
    function render(images) {
        if (images.length == 0)
            return;
        let image = images.pop();
        api.setCookieKV('image', image._id);
        renderGallery(image);
        renderComments(image._id);
        renderCommentForm(image._id);
    }

    /* to be used when getting the latest image, if image is null then
     * gallery must be cleared. This is different behaviour to when doing
     * a normal render; when a normal render is used the current image will
     * NOT be deleted if the incoming image is null.
     */
    function renderLatest(images) {
        if (images.length == 0) {
            api.delCookieK('image');
            let gallerySection = document.getElementById('gallery-section');
            gallerySection.innerHTML = '';
        } else {
            api.setCookieKV('image', images[0]._id);
            render(images);
        }
    }

    /*
     * to be used when gallery already exists,
     * stops screen from jumping around by not re-creating gallery
     */
    function updateGallery(gallery, image) {
        gallery.querySelector('#gal-title').innerHTML = image.title;
        gallery.querySelector('#gal-author').innerHTML = `By ${image.author}`;
        let galleryImg = gallery.querySelector('#gallery-img');
        galleryImg.setAttribute('src', `/api/images/${image._id}/file`);
        galleryImg.setAttribute('alt', image._id);

        gallery.querySelector('#gal-prev').onclick = function(e){
            document.getElementById('error_box').innerHTML = '';
            api.getPrevImage(image, render);
        };
        gallery.querySelector('#gal-delete').onclick = function(e){
            document.getElementById('error_box').innerHTML = '';
            api.deleteImage(image._id);
        };
        gallery.querySelector('#gal-next').onclick = function(e){
            document.getElementById('error_box').innerHTML = '';
            api.getNextImage(image, render);
        };
    }

    /* create a new gallery and show image */
    function createGallery(image) {
        let gallerySection = document.getElementById('gallery-section');
        gallerySection.innerHTML = '';

        let gallery = document.createElement('div');
        gallery.id = 'gallery';
        gallery.className = 'section';
        gallery.innerHTML=`
            <div class="row overlay overlay-top">
                <a id="gal-title" class="btn overlay-item img-title"></a>
                <a id="gal-author" class="btn overlay-item img-author"></a>
            </div>
            <img id="gallery-img" src="" alt="">
            <div class="row overlay overlay-bottom">
                <a id="gal-prev" class="btn overlay-item btn-blue">Previous</a>
                <a id="gal-delete" class="btn overlay-item btn-red">Delete</a>
                <a id="gal-next" class="btn overlay-item btn-blue">Next</a>
            </div>

            <div id="comments" class="section section-gallery"></div>
            <div id="comment-form-section" class="section section-gallery section-row"></div>
        `;
        gallerySection.append(gallery);
        updateGallery(gallery, image);
    }

    /* showcase image in gallery */
    function renderGallery(image) {
        let gallery = document.getElementById('gallery');
        if (gallery != null)
            updateGallery(gallery, image);
        else
            createGallery(image);
    }

    /* fetch and render the comments given an imageId */
    function renderComments(imageId) {
        /* comments skeleton always need to redraw */
        let comments = document.getElementById('comments');
        let newcomments = document.createElement('div');
        newcomments.id = 'comments';
        newcomments.className = 'items section';
        newcomments.innerHTML=`
                <div class="section-header">
                    <h4>Comment Section</h4>
                </div>
                <div class="line"></div>
        `;
        api.getComments(imageId,  function(commentList) {
            let i = 0;
            if (commentList == null || commentList.length == 0)
                comments.replaceWith(newcomments);
            commentList.forEach(function(comment) {
                i = i + 1;
                let divComment = document.createElement('div');
                divComment.className = 'item';
                divComment.innerHTML=`
                    <div class="item-details">
                        <a class="btn btn-red btn-mini delete-item">×</a>
                        <div class="item-author">${comment.author} said...</div>
                        <div class="item-content">${comment.content}</div>
                        <div class="item-date">${(new Date(comment.createdAt)).toLocaleString()}</div>
                    </div>
                `;
                divComment.querySelector('.delete-item').onclick = function(e) {
                    document.getElementById('error_box').innerHTML = '';
                    api.deleteComment(comment._id);
                };
                newcomments.append(divComment);
                if (i == commentList.length)
                    comments.replaceWith(newcomments);
            });
        });
    }

    /* create a new comment form for the given imageId */
    function createCommentForm(imageId) {
        let commentFormSection = document.getElementById('comment-form-section');
        let commentForm = document.createElement('form');
        commentForm.id = 'comment-form';
        commentForm.innerHTML=`
            <div class="section-header">
                <h4>Add a Comment</h4>
            </div>
            <div class="line"></div>
<!--
            <div>
                <label for="comment-author">Your Name</label>
                <input id="comment-author" type="text" required>
            </div>
-->
            <div>
                <label for="comment-content">Your Comment</label>
                <textarea rows="4" id="comment-content" required></textarea>
            </div>
            <div>
                <input class="btn btn-green" type="submit" value="Post Comment">
            </div>
        `;
        commentFormSection.innerHTML = '';
        commentFormSection.append(commentForm);
        updateCommentForm(commentForm, imageId);
    }

    /* update the comment form to work for the new imageId */
    function updateCommentForm(commentForm, imageId) {
        commentForm.onsubmit = function(e) {
            e.preventDefault();
            document.getElementById('error_box').innerHTML = '';
            //let author = this.querySelector('#comment-author');
            let content = this.querySelector('#comment-content');
            let imageId = document.getElementById('gallery-img').getAttribute('alt');
            //api.addComment(author.value, content.value);
            api.addComment(content.value);
            //author.value = '';
            content.value = '';
        };
    }

    /* comment form for the imageId */
    function renderCommentForm(imageId) {
        let commentForm = document.getElementById('comment-form');
        if (commentForm == null)
            createCommentForm(imageId);
        else
            updateCommentForm(commentForm, imageId);
    }

    window.onload = function() {
        api.onError(function(err){
            console.error('[error]', err);
        });

        api.onError(function(err){
            let error_box = document.querySelector('#error_box');
            error_box.innerHTML = err;
            error_box.style.visibility = 'visible';
        });

        // username is not set -> show sign in form
        if (api.getCookieV('username') == '') {
            signInMode();
            api.onUserUpdate(function(user) {
                let signinSection = document.getElementById('signin-section');
                if (signinSection)
                    signinSection.parentNode.removeChild(signinSection);
                galleriesMode();
            });
        }
        // username is set and the current gallery is not -> show galleries
        else if (api.getCookieV('gallery') == '') {
            galleriesMode();
        }
        // gallery is set -> show gallery
        else {
            clearGalleries();
            galleryMode();
        }
    };
}());
