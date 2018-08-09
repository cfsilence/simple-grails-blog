$(document).ready(function(){
    $('.datepicker').datetimepicker({ format: dateFormat})
    //wysihtml.insertsLineBreaksOnReturn = true;
    editor = new wysihtml.Editor(
            "wysihtml-textarea", {
                insertsLineBreaksOnReturn: false,
                toolbar: "toolbar",
                parserRules: wysihtmlParserRules
            }
    )
    editor.on( "load", function() {
        // Trick browser into showing HTML5 required validation popups.
        $('#wysihtml-textarea').addClass('nicehide');
    } );

    $('#addTagBtn').on('click', function(){
        $('#newTagModal').modal({show: true})
        $('#newTag').val('')
    })

    $('#saveNewTagBtn').on('click', function(){
        var tagEl = $('#newTag')
        if( !tagEl.val().length ) {
            tagEl.closest('.form-group').addClass('has-error')
        }
        else {
            tagEl.closest('.form-group').removeClass('has-error')

            $.ajax({
                url:   '/blog/ajaxSaveTag?tag=' + tagEl.val(),
                success: function(result){
                    $('#newTagModal').modal('hide')
                    currentTags = $('#postTags').val()
                    listTags()
                },
                error: function(){
                    alert('An error occurred trying to save this tag.  Please try again.')
                }
            })
        }
    })

    $('#viewSourceBtn').on('click', function(){
        if( $('.nicehide').size() > 0 ) {
            $('.nicehide').addClass('nonicehide').removeClass('nicehide')
        }
    })

    $('#btnSubmit').on('click', function(){
        if( $('.nonicehide').size() > 0 ) {
            $('.nonicehide').addClass('nicehide').removeClass('nonicehide')
        }
    })

    listTags()

    setInterval(function(){
        // keep the session alive so that it doesn't expire in the middle of a blog post
        $.ajax({url: '/'})
    }, 30000)

    $('.preview-post-trigger').on('click', function(){
        $.ajax(
            {
                method: 'POST',
                dataType: 'html',
                url: '/blog/previewPost?c=' + new Date().getTime(),
                data: {
                    post: $('#wysihtml-textarea').val()
                },
                success: function(result) {
                    $('#previewBody').html('')
                    postscribe('#previewBody', result, {
                        done: function() {
                            // a bit hackish, but need to do what's in "onReady" of the post manually...
                            $('#previewBody').find('.spoiler').hide()
                            $('#previewBody').on('click', '.showSpoiler', function(){
                                $(this).closest('div').find('.spoiler').show()
                                $(this).hide()
                                return false
                            })
                        }
                    })
                    $('#previewModal').modal('show')
                },
                error: function(e) {
                    console.error(e);
                    alert('Error generating preview!')
                }
            }
        )
    })

    $('.help-modal-trigger').on('click', function(){
        $('#helpModal').modal('show')
    })

    $('.browse-s3-trigger').on('click', function(){
        $('#s3Modal').on('shown.bs.modal', function(){
            $('#s3BrowserIframe').get(0).src += ' ';
        });
        $('#s3Modal').modal('show')
    })

    $('#createGistBtn').on('click', function(){
        $('#createGistBtn').attr('disabled', 'disabled').html('<i class="fa fa-refresh fa-spin"></i> Creating...')

        $.ajax({
            url: '/blog/createGist',
            method: 'POST',
            data: {
                name: $('#createGistName').val(),
                description: $('#createGistDescription').val(),
                code: aceEditor.getValue()
            },
            success: function(result) {
                console.log(result);
                editor.focus();
                editor.composer.commands.exec("insertHTML","[gist2 id=" + result.gist.id + "]");
                $('#createGistModal').modal('hide')
            },
            error: function(e) {
                console.error(e);
                alert('Error posting Gist.  Check console.');
            },
            complete: function(){
                $('#createGistBtn').html('Create').removeAttr('disabled')
            }
        })
    })

    $('.create-gist-trigger').on('click', function(){
        $('#createGistModal').on('shown.bs.modal', function(){
            $('#createGistCode').val('')
            $('#createGistDescription').val('')
            $('#createGistName').val('')

            // create code editor
            if( typeof aceEditor === 'undefined' ) {
                aceEditor = ace.edit("createGistCode");
                aceEditor.setTheme("ace/theme/dracula");
                aceEditor.session.setMode("ace/mode/javascript");
            }
            aceEditor.setValue('')
        })
        $('#createGistModal').modal('show')
    })

    var aceExtMapping = {
        'js': 'ace/mode/javascript',
        'ts': 'ace/mode/javascript',
        'groovy': 'ace/mode/groovy',
        'gsp': 'ace/mode/groovy',
        'gson': 'ace/mode/groovy',
        'java': 'ace/mode/java',
    }

    $(document).on('keydown', '#createGistName', function() {
        var nameArr = $(this).val().split('.');
        var ext = nameArr[nameArr.length-1];
        var aceMode = aceExtMapping[ext];
        if( aceMode ) {
            aceEditor.session.setMode( aceMode )
        }
    });

    $('#addUploadBtn').on('click', function(){
        var row = $('.upload-row').last().clone()
        var idx = $('.upload-row').length
        $(row).find('.folder-label').attr('for', 'uploadFolder_' + idx)
        $(row).find('.key-label').attr('for', 'uploadKey_' + idx)
        $(row).find('.file-label').attr('for', 'uploadFile_' + idx)
        $(row).find('.upload-folder').val('').attr('id', 'uploadFolder_' + idx).attr('name', 'uploadFolder_' + idx)
        $(row).find('.upload-key').val('').attr('id', 'uploadKey_' + idx).attr('name', 'uploadKey_' + idx)
        $(row).find('.upload-file').val('').attr('id', 'uploadFile_' + idx).attr('name', 'uploadFile_' + idx)
        $(row).insertAfter($('.upload-row').last())
        return false;
    })

    $(document).on('click', '.remove-upload', function(){
        if( $('.upload-row').length > 1 ) {
            $(this).closest('.upload-row').remove()
        }
        return false;
    })

    objectifyForm = function(formArray) {
        var returnArray = {};
        for (var i = 0; i < formArray.length; i++){
            returnArray[formArray[i]['name']] = formArray[i]['value'];
        }
        return returnArray;
    }

    savePost = function() {
        $('#btnSubmit').html('<i class="fa fa-refresh fa-spin"></i> Saving...').attr('disabled', 'disabled')
        var form = objectifyForm( $('form[name="postForm"]').serializeArray() );
        $.ajax({
            url: '/blog/edit',
            dataType: 'json',
            data: form,
            method: 'POST',
            success: function(result) {
                $('#SYNCHRONIZER_TOKEN').val(result.token);
                $('#id').val(result.post.id);
                $('#version').val(result.post.version);
                window.history.pushState("", "", '/blog/edit/' + result.post.id);
            },
            error: function(e) {
                console.error(e);
                alert('Error saving post.  See console.')
            },
            complete: function(){
                $('#btnSubmit').html('Save').removeAttr('disabled')
            }
        })
    }

    $('#btnSubmit').on('click', function(){
        savePost();
        return false;
    })

    $(document).on('keydown', '.fullscreen', function(e){
        console.log(e)
        if( e.which === 27 ) {
            $(this).removeClass('fullscreen')
        }
        return false;
    })

    $('.full-screen-trigger').on('click', function(){
        var editor = $('#editor')
        editor.toggleClass('fullscreen')
        return false;
    })

    $('#uploadFileBtn').on('click', function(){
        var formData = new FormData();
        $('.upload-folder').each(function(i,e){
            formData.append('folder_' + i, $(e).val());
        })
        $('.upload-key').each(function(i,e){
            formData.append('key_' + i, $(e).val());
        })
        $('.upload-file').each(function(i,e){
            formData.append('upload_' + i, $(e).get(0).files[0]);
        })
        $('#uploadFileBtn').attr('disabled', 'disabled').html('<i class="fa fa-refresh fa-spin"></i> Uploading...')
        $.ajax({
            url: '/blog/uploadFile',
            method: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(result) {
                console.log(result);
                $('#uploadFileBtn').removeAttr('disabled').html('Upload')
                $('#s3UploadModal').modal('hide')
            },
            error: function(e) {
                console.error(e);
                $('#uploadFileBtn').removeAttr('disabled').html('Upload')
                alert('Error uploading file.  See console.');
            }
        })
    })

    $('.upload-s3-trigger').on('click', function(){
        $('#s3UploadModal').on('shown.bs.modal', function(){
            $('.upload-row').not(':last').remove()
            $('.upload-folder, .upload-key, .upload-file').val('')
        })
        $('#s3UploadModal').modal('show')
    })

    var f = document.querySelector('.wysihtml-sandbox');
    var iframeDoc = f.contentDocument || f.contentWindow.document;

    $('iframe').load(function(){
        var styles = 'br{content: ".";display: inline-block;width: 100%;border-bottom: 2px dashed red;}p{border:1px dotted}code{padding:2px 4px;font-size:90%;color:#c7254e;background-color:#f9f2f4;border-radius:4px}.alert{padding:15px;margin-bottom:20px;border:1px solid transparent;border-radius:4px}.alert-success{color:#3c763d;background-color:#dff0d8;border-color:#d6e9c6}.alert-warning{color:#8a6d3b;background-color:#fcf8e3;border-color:#faebcc}.alert-danger{color:#a94442;background-color:#f2dede;border-color:#ebccd1}.alert-info{color:#31708f;background-color:#d9edf7;border-color:#bce8f1}';
        $(iframeDoc).contents().find("head")
            .append($("<style type='text/css'>"+styles+"</style>"));
    })


})

listTags = function(){
    $.ajax(
            {
                url: '/blog/ajaxListTags',
                success: function(result){
                    var sel = $('#postTags')
                    sel.html('')

                    $(result).each(function(i,e){
                        var opt = $('<option value="' + e.id + '">' + e.name + '</option>')
                        if( $.inArray(e.id.toString(), currentTags) != -1 ) {
                            opt.attr('selected', 'selected')
                        }
                        sel.append(opt)
                    })
                },
                error: function(){
                    alert('An error occurred trying to list tags.  Please try again.')
                }
            }
    )
}