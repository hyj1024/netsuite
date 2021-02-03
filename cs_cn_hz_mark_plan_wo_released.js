/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 *
 * Version    Date          Author      Action      Remarks
 * 1.0        20201224      Tyrion      Create      Mark Work Orders Released
 *
 */
define(['N/ui/message', 'N/query', 'N/https', 'N/url', 'N/runtime'],
/**
 * @param{message} message
 * @param{query} query
 * @param{https} https
 * @param{https} url
 * @param{runtime} runtime
 */
function(message, query, https, url, runtime) {

    var EXPORT_OBJ = {
        // pageInit: pageInit,
        fieldChanged: fieldChanged,
        // postSourcing: postSourcing,
        // sublistChanged: sublistChanged,
        // lineInit: lineInit,
        // validateField: validateField,
        // validateLine: validateLine,
        // validateInsert: validateInsert,
        // validateDelete: validateDelete,
        saveRecord: saveRecord,
        pageChanged: pageChanged,
    };
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {

        // var userId = runtime.getCurrentUser().id;
        // if (userId === 3203) {
        //     console.log('hello, Tyrion');
        //     jQuery("#custpage_doc_nums").attr("placeholder", "Type a name (Lastname, Firstname)").blur();
        // }
    }

    function pageChanged(page) {

        var thisUrl = window.location.href;
        thisUrl = changeURLArg(thisUrl,'curPageIndex',page);
        setWindowChanged(window,false);
        window.location.href = thisUrl;
    }

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {

        //custpage_dep  custpage_rows   custpage_doc_nums
        var triggerRouter = {};
        triggerRouter['custpage_dep'] = fieldChangeHandler;
        triggerRouter['custpage_rows'] = fieldChangeHandler;
        triggerRouter['custpage_doc_nums'] = fieldChangeHandler;
        triggerRouter['custpage_page_total'] = fieldChangeHandler.bind(scriptContext);

        triggerRouter.hasOwnProperty(scriptContext.fieldId) &&
        triggerRouter[scriptContext.fieldId].call(scriptContext);
    }

    function fieldChangeHandler() {

        var currentRecord = this.currentRecord;
        var selected_dep_id = currentRecord.getValue({fieldId: 'custpage_dep'});
        var selected_rows_num = currentRecord.getValue({fieldId: 'custpage_rows'});
        var selected_doc_nums = currentRecord.getValue({fieldId: 'custpage_doc_nums'});
        var selected_page_num = currentRecord.getValue({fieldId: 'custpage_page_total'});
        !!selected_doc_nums && (selected_doc_nums = JSON.stringify(selected_doc_nums));
        var curUrl = window.location.href;

        if (!!~curUrl.indexOf('&custparam_error_msg')) {
            curUrl = curUrl.split('&custparam_error_msg')[0];
        }
        if (!!~curUrl.indexOf('&custparam_sucess_msg')) {
            curUrl = curUrl.split('&custparam_sucess_msg')[0];
        }
        curUrl = changeURLArg (curUrl, 'displayRows', selected_rows_num);
        curUrl = changeURLArg(curUrl, 'depId', selected_dep_id);
        curUrl = changeURLArg(curUrl, 'docNums', selected_doc_nums);
        !!selected_page_num && (curUrl = changeURLArg(curUrl, 'curPageIndex', selected_page_num));

        setWindowChanged(window, false);
        window.location.href = curUrl;
    }

    // 参数变化，修改或者调整URL中的参数
    function changeURLArg(curUrl,arg,arg_val){
        var pattern=arg+'=([^&]*)';
        var replaceText=arg+'='+arg_val;
        if(curUrl.match(pattern)){
            var tmp='/('+ arg+'=)([^&]*)/gi';
            tmp=curUrl.replace(eval(tmp),replaceText);
            return tmp;
        }else{
            if(curUrl.match('[\?]')){
                return curUrl+'&'+replaceText;
            }else{
                return curUrl+'?'+replaceText;
            }
        }
    }

    /**
     * Function to be executed when field is slaved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     *
     * @since 2015.2
     */
    function postSourcing(scriptContext) {

    }

    /**
     * Function to be executed after sublist is inserted, removed, or edited.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function sublistChanged(scriptContext) {



    }



    /**
     * Function to be executed after line is selected.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function lineInit(scriptContext) {

    }

    /**
     * Validation function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @returns {boolean} Return true if field is valid
     *
     * @since 2015.2
     */
    function validateField(scriptContext) {

    }

    /**
     * Validation function to be executed when sublist line is committed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateLine(scriptContext) {

    }

    /**
     * Validation function to be executed when sublist line is inserted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateInsert(scriptContext) {

    }

    /**
     * Validation function to be executed when record is deleted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateDelete(scriptContext) {

    }

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    function saveRecord(scriptContext) {

        var validateFlag = false;
        var curRec = scriptContext.currentRecord;
        var lineSelectedIndex = curRec.findSublistLineWithValue({sublistId: 'custpage_info_list', fieldId: 'sub_checkbox', value: 'T'});
        !!~lineSelectedIndex && (validateFlag = true);

        if (!validateFlag) {
            message.create({
                title: '警告',
                message: '请选择勾稽货品行后提交',
                type: message.Type.WARNING,
            }).show();
        }

        var scriptId = 576;
        var freeProcedureCnt = getFreeDeploymentsCnt(scriptId);
        if (!freeProcedureCnt) {
            validateFlag = false;
            message.create({
                title: '警告',
                message: '缺少空闲处理器, 请稍候重试',
                type: message.Type.WARNING,
                duration: 15 * 1000,
            }).show();
        }
        return validateFlag;
    }

    function getFreeDeploymentsCnt(scriptId) {

        var suiteURL = url.resolveScript({
            scriptId: 'customscript_sl_cn_hz_common_query',
            deploymentId: 'customdeploy_sl_cn_hz_common_query',
        });
        var bodyParams = {
            func: 'getFreeDeploymentsCntByScriptId',
            params: [scriptId],
        };
        var response = https.post({
            url: suiteURL,
            body: JSON.stringify(bodyParams),
        });

        return JSON.parse(response.body);
    }

    return EXPORT_OBJ;
    
});
