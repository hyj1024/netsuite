/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 *
 * Version    Date          Author      Action      Remarks
 * 1.0        20201224      Tyrion      Create      Mark Work Orders Released
 *            20201229      Tyrion      Deploy      Summarize: data 获取即逐行渲染 VS Data整理好再行渲染?
 *
 * scriptURL: 
 * scriptDebuggerUrl: 
 *
 * pageURL: 
 * pageDebuggerUrl: 
 */
define(['N/ui/dialog', 'N/ui/message', 'N/query', 'N/ui/serverWidget', 'N/runtime', 'N/url', 'N/redirect', 'N/task', ],
/**
 * @param{dialog} dialog
 * @param{message} message
 * @param{query} query
 * @param{serverWidget} serverWidget
 * @param{runtime} runtime
 * @param{url} url
 * @param{redirect} redirect
 * @param{task} task
 */
function(dialog, message, query, serverWidget, runtime, url, redirect, task, ) {

    const EXPORT_OBJ = {
        onRequest: onRequest
    };
    let parameters;
    let totalPageNums = 1;
    let curRealPageIndex = 0;
    let totalQty = 0;
    const FORM_OBJ = {
        Title: {title: '标记工单为已发放Beta', hideNavBar: false},
        Body: {
            PageLink: {
                Doc: {
                    type : serverWidget.FormPageLinkType.CROSSLINK,
                    title : '页面文档',
                    url : 'https://www.yuque.com/docs/share/1d8ea4ad-c0e3-431c-810e-e648710bd01f'
                },
            },
            SubmitBtn: {label: '提交'},
            FieldGroup: {
                Id:{id: 'custpage_filter_group', label: '过滤器'},
                Filters: {
                    deps: {
                        id: 'custpage_dep', label: '部门',
                        type: serverWidget.FieldType.SELECT,
                        source: '80',//location
                        container: 'custpage_filter_group',
                    },
                    rows: {
                        id: 'custpage_rows', label: '显示行数',
                        type: serverWidget.FieldType.SELECT,
                        container: 'custpage_filter_group', displayRows: [200, 500, 1000]
                    },
                    docNums: {
                        id: 'custpage_doc_nums', label: '工单号数据集',
                        type: serverWidget.FieldType.LONGTEXT,
                        container: 'custpage_filter_group',
                    },
                },
                Custom_Filter: {
                    pages: {
                        id: 'custpage_page_total',
                        label: `页/总: ${totalPageNums}`,
                        container: 'custpage_filter_group',
                        type: serverWidget.FieldType.SELECT,
                    },
                    totalQty: {
                        id: 'custpage_total_qty', label: '汇总数量',
                        type: serverWidget.FieldType.FLOAT,
                        container: 'custpage_filter_group',
                    },
                }
            },
        },
        SublistGroup: {
            Id: {id: 'custpage_info_list', type: serverWidget.SublistType.LIST, label: '已计划生产工作单列表', tab: 'wo_group'},
            WoSub: [
                { id: 'sub_checkbox', label: '选择', type: serverWidget.FieldType.CHECKBOX,},
                { id: 'sub_view', label: '查看', type: serverWidget.FieldType.URL, linkText: '查看', },
                { id: 'sub_date', label: '日期', type: serverWidget.FieldType.DATE, },
                { id: 'sub_doc_num', label: '工单号', type: serverWidget.FieldType.TEXT, },
                { id: 'sub_item', label: '货品', type: serverWidget.FieldType.TEXT, },
                { id: 'sub_location', label: '制造仓', type: serverWidget.FieldType.TEXT, },
                { id: 'sub_start_date', label: '开工日期', type: serverWidget.FieldType.DATE, },
                { id: 'sub_end_date', label: '完工日期', type: serverWidget.FieldType.DATE, },
                { id: 'sub_qty', label: '数量', type: serverWidget.FieldType.TEXT, },
                { id: 'sub_wo_id', label: '工单ID', type: serverWidget.FieldType.TEXT, displayType: serverWidget.FieldDisplayType.HIDDEN,},//displayType: serverWidget.FieldDisplayType.HIDDEN,
            ],
        }
    };

    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {

        const reqRouter = {
            'GET': reqGet,
            'POST': reqPost,
        };
        context.request.method &&
        reqRouter.hasOwnProperty(context.request.method) &&
        reqRouter[context.request.method].call(context);
    }

    async function reqGet() {

        const startTime = new Date().getTime();
        let form;
        try {
            // Create Form
            form = await createForm.call(this);
            // Get filtered data
            const formSublistDataArr = await getFormSublistDataArr.call(form);
            if (!!formSublistDataArr.length) {
                // Page Handler
                await pagedSublistFormHandler.call(form);
                // Render sublist data
                await renderFormSublistData.call(form, formSublistDataArr);
            }
        }catch(error) {
            log.error('reqGetError', JSON.stringify(error));
            form = errorHandler.call(this, error);
        }

        this.response.writePage(form);

        const endTime = new Date().getTime();
        log.debug(`reqGet time cost`, `${endTime-startTime} ms`);
    }

    async function pagedSublistFormHandler() {

        const sublist = this.getSublist({id: FORM_OBJ.SublistGroup.Id.id});
        const submitBtn = this.addSubmitButton(FORM_OBJ.Body.SubmitBtn);
        // (runtime.getCurrentUser().id !== 3203) && (submitBtn.isDisabled = true);
        sublist.addRefreshButton();
        sublist.addMarkAllButtons();

        const totalQtyField = this.addField(FORM_OBJ.Body.FieldGroup.Custom_Filter.totalQty);
        totalQtyField.defaultValue = totalQty;
        totalQtyField.updateDisplayType({displayType: serverWidget.FieldDisplayType.DISABLED,});

        if (totalPageNums > 1) {

            FORM_OBJ.Body.FieldGroup.Custom_Filter.pages.label = `页/总: ${totalPageNums}`;
            const pageField = this.addField(FORM_OBJ.Body.FieldGroup.Custom_Filter.pages);

            const pageArr = [...Array(totalPageNums).keys()];
            pageArr.forEach((item, index) => {
                pageField.addSelectOption({ value : index, text : (item+1) });
            });
            pageField.defaultValue = curRealPageIndex;

            const previousBtn = sublist.addButton({
                id: 'custpage_previous',
                label: '上一页',
                functionName: `pageChanged(${curRealPageIndex-1})`
            });
            const nextBtn = sublist.addButton({
                id: 'custpage_next',
                label: '下一页',
                functionName: `pageChanged(${curRealPageIndex + 1})`
            });
            curRealPageIndex === 0 && (previousBtn.isDisabled = true);
            curRealPageIndex === (totalPageNums-1) && (nextBtn.isDisabled = true);
        }
    }

    async function renderFormSublistData(formSublistDataArr) {

        const sublist = this.getSublist({id: FORM_OBJ.SublistGroup.Id.id});
        for (const [line, lineColumnsArr] of formSublistDataArr.entries()) {
            for (const [j, value] of lineColumnsArr.entries()) {
                const id = FORM_OBJ.SublistGroup.WoSub[j+1].id;
                if(id === 'sub_view') {
                    const linkUrl = url.resolveRecord({
                        recordType: 'workorder',
                        recordId: value,
                        isEditMode: false,
                    });
                    sublist.setSublistValue({id, line, value: linkUrl});
                    continue;
                }
                sublist.setSublistValue({id, line, value});
            }
        }

    }

    async function getFormSublistDataArr() {

        const startTime = new Date().getTime();

        //Oracle combine column tips
        //https://stackoverflow.com/questions/22739841/mysql-combine-two-columns-into-one-column/22739860
        const sublistDataArr = [];
        const curPageIndex = parseInt(parameters.curPageIndex) || 0;
        const displayRowsId = this.getField({id: FORM_OBJ.Body.FieldGroup.Filters.rows.id}).defaultValue;
        const displayRows = FORM_OBJ.Body.FieldGroup.Filters.rows.displayRows[displayRowsId];
        const depId = getDepByListId(this.getField({id: FORM_OBJ.Body.FieldGroup.Filters.deps.id}).defaultValue);
        let woDocNums = parameters.docNums;
        let transDocNumsArr = [];//['HZ-20000868-1', 'HZ-20000866-2'];
        !!woDocNums && (transDocNumsArr = (woDocNums.slice(1, woDocNums.length-1)).split('\\n').filter(item => item !== ''));

        let querySQL = `SELECT 
              "TRANSACTION"."ID",
              "TRANSACTION".trandate AS trandateRAW /*{trandate#RAW}*/, 
              "TRANSACTION".tranid AS tranidRAW /*{tranid#RAW}*/, 
              (item.itemid || ' ' || item.displayname) AS transactionlinesitemRAW /*{transactionlines.item#RAW}*/, 
              location.name AS transactionlineslocationRAW /*{transactionlines.location#RAW}*/, 
              "TRANSACTION".startdate AS startdateRAW /*{startdate#RAW}*/, 
              "TRANSACTION".enddate AS enddateRAW /*{enddate#RAW}*/, 
              transactionLine.quantity AS transactionlinesquantityRAW /*{transactionlines.quantity#RAW}*/,
              "TRANSACTION"."ID"
            FROM 
              "TRANSACTION", 
              transactionLine,
              item,
              location
            WHERE 
              "TRANSACTION"."ID" = transactionLine."TRANSACTION"
               AND UPPER("TRANSACTION"."TYPE") = 'WORKORD'
               AND NVL(transactionLine.mainline, 'T') = 'T'
               AND UPPER("TRANSACTION".status) = 'A'
               AND item.id = transactionLine.item
               AND transactionLine."LOCATION" = location.id
               `;
        !!depId && (querySQL = querySQL.concat(`AND transactionLine."LOCATION" = ${depId}`));
        !!transDocNumsArr.length && (querySQL = querySQL.concat(` AND "TRANSACTION".tranid in (${"'".concat(transDocNumsArr.join("','")).concat("'")})`));
        querySQL = querySQL.concat(` ORDER BY "TRANSACTION".trandate DESC`);

        const myPagedResults = query.runSuiteQLPaged({
            query: querySQL, pageSize: displayRows,
        });
        totalPageNums = myPagedResults.pageRanges.length;
        curRealPageIndex = (curPageIndex < totalPageNums ? curPageIndex : (totalPageNums-1));
        if (myPagedResults.count > 0) {
            const myPage = myPagedResults.fetch({index: curRealPageIndex});
            for (const result of myPage.data.results) {
                sublistDataArr.push(result.values);
                totalQty += result.values[7];
            }
        }

        const endTime = new Date().getTime();
        log.debug(`getFormSublistDataArr time cost`, `${endTime-startTime} ms`);

        return sublistDataArr;
    }





    async function createForm() {

        parameters = this.request.parameters;
        const form = serverWidget.createForm(FORM_OBJ.Title);
        form.addPageLink(FORM_OBJ.Body.PageLink.Doc);
        const curUserId = runtime.getCurrentUser().id;
        const depId = parameters.hasOwnProperty('depId') ? parameters.depId : getDepByUserId(curUserId);
        const displayRows = parseInt(parameters.displayRows) || 0;
        const errorMsg = parameters.custparam_error_msg;
        const successMsg = parameters.custparam_sucess_msg;
        !!errorMsg && initErrorHandler.call(form, errorMsg);
        !!successMsg && initSuccessHandler.call(form, successMsg);

        let woNums = '';
        parameters.docNums && (woNums = JSON.parse(parameters.docNums));

        form.addFieldGroup(FORM_OBJ.Body.FieldGroup.Id);
        Object.values(FORM_OBJ.Body.FieldGroup.Filters).forEach(filter => {
            const curFilter = form.addField(filter);
            filter.hasOwnProperty('displayRows') && (filter.displayRows.forEach((item, index) => {
                curFilter.addSelectOption({value: index, text: item});
            }), curFilter.defaultValue = displayRows);
            filter.id === 'custpage_dep' && (curFilter.defaultValue = depId);
            filter.id === 'custpage_doc_nums' && (curFilter.defaultValue = woNums);
        });

        const infoSublist = form.addSublist(FORM_OBJ.SublistGroup.Id);
        FORM_OBJ.SublistGroup.WoSub.forEach(column => {
            const curColumn = infoSublist.addField(column);
            column.hasOwnProperty('displayType') && curColumn.updateDisplayType(column);
            column.hasOwnProperty('linkText') && (curColumn.linkText = column.linkText);
        });

        // form.clientScriptModulePath = './cs_cn_hz_mark_plan_wo_released.js';//[Violation] 'setTimeout' handler took 254ms
        form.clientScriptFileId = 71645;
        return form;
    }

    function initErrorHandler(errorMsg) {
        this.addPageInitMessage({
            title: '错误',
            message: `批量更新任务创建失败</br>失败详情: ${errorMsg}`,
            type: message.Type.ERROR,
        });
    }

    function initSuccessHandler(successMsg) {
        var detailListUrl = 'https://4850287.app.netsuite.com/app/common/custom/custrecordentrylist.nl?rectype=129';
        this.addPageInitMessage({
            title: '确认',
            message: `批量更新任务创建成功<br/>进度详情页: <a href="${detailListUrl}">点击此处</a>`,
            type: message.Type.CONFIRMATION,
        })
    }



    function getDepByUserId(userId) {
        const defaultDep = {
            3261: 1, //段含真 SMT
            3251: 4, //肖连玲 钣金,
            // 3264: 1, //李吉玲 smt 装配 其它
            // 5546: 2,//孟梦/储玲玲    装配
            // 5629: 2,
            3203: 4,
        };
        const dep = defaultDep.hasOwnProperty(userId) ? defaultDep[userId] : 2;
        return dep;
    }

    function getDepByListId(wo_temp_dep) {

        let wo_department = 0;
        switch (wo_temp_dep) {
            case '1':
                wo_department = 354;
                break;
            case '2':
                wo_department = 469;
                break;
            case '3':
                wo_department = 462;
                break;
            case '4':
                wo_department = 654;
                break;
            case '5':
                wo_department = 758;
                break;
            default:
                wo_department = 0;
                break;
        }
        return wo_department;
    }

    async function waitingFunc() {

        log.debug('waitingFuncCalled');
        var hello = `hello async`;
        var currentTime = new Date()
        var waitTill = (new Date(currentTime.getTime() + 1000 * 5)).getTime()

        for (;;)
            if ((new Date()).getTime() > waitTill)
                break;

        return hello;
    }

    function errorHandler(e) {

        const form1 = serverWidget.createForm({
            title: 'ERROR PAGE',
            hideNavBar: false,
        });
        form1.addField({
            id : 'custpage_abc_text',
            type : serverWidget.FieldType.INLINEHTML,
            label : 'Text'
        }).updateLayoutType({
            layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
        }).updateBreakType({
            breakType: serverWidget.FieldBreakType.STARTROW
        }).defaultValue = errorPageHtml3();

        form1.addPageInitMessage({
            title: '载入失败',
            message: `错误详情: ${e.message}`,
            type: message.Type.ERROR,
        });
        return form1;
    }

    function errorPageHtml3() {

        return "<!DOCTYPE html>\n" +
            "<html lang=\"en\">\n" +
            "<head>\n" +
            "\n" +
            "</head>\n" +
            "<!-- purple x moss 2020 -->\n" +
            "\n" +
            "<head>\n" +
            "    <meta charset=\"UTF-8\">\n" +
            "    <title>Title</title>\n" +
            "    <link href=\"https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@600;900&display=swap\" rel=\"stylesheet\">\n" +
            "    <script src=\"https://kit.fontawesome.com/4b9ba14b0f.js\" crossorigin=\"anonymous\"></script>\n" +
            "    <style>\n" +
            "\n" +
            "        body {\n" +
            "        background-color: #95c2de;\n" +
            "        }\n" +
            "\n" +
            "        .mainbox {\n" +
            "        background-color: #95c2de;\n" +
            "        margin: auto;\n" +
            "        height: 600px;\n" +
            "        width: 600px;\n" +
            "        position: relative;\n" +
            "        }\n" +
            "\n" +
            "        .err {\n" +
            "        color: #ffffff;\n" +
            "        font-family: 'Nunito Sans', sans-serif;\n" +
            "        font-size: 11rem;\n" +
            "        position:absolute;\n" +
            "        left: 20%;\n" +
            "        top: 8%;\n" +
            "        }\n" +
            "\n" +
            "        .far {\n" +
            "        position: absolute;\n" +
            "        font-size: 8.5rem;\n" +
            "        left: 42%;\n" +
            "        top: 15%;\n" +
            "        color: #ffffff;\n" +
            "        }\n" +
            "\n" +
            "        .err2 {\n" +
            "        color: #ffffff;\n" +
            "        font-family: 'Nunito Sans', sans-serif;\n" +
            "        font-size: 11rem;\n" +
            "        position:absolute;\n" +
            "        left: 68%;\n" +
            "        top: 8%;\n" +
            "        }\n" +
            "\n" +
            "        .msg {\n" +
            "        text-align: center;\n" +
            "        font-family: 'Nunito Sans', sans-serif;\n" +
            "        font-size: 1.6rem;\n" +
            "        position:absolute;\n" +
            "        left: 16%;\n" +
            "        top: 45%;\n" +
            "        width: 75%;\n" +
            "        }\n" +
            "\n" +
            "        a {\n" +
            "        text-decoration: none;\n" +
            "        color: white;\n" +
            "        }\n" +
            "\n" +
            "        a:hover {\n" +
            "        text-decoration: underline;\n" +
            "        }\n" +
            "    </style>\n" +
            "</head>\n" +
            "<body>\n" +
            "<div class=\"mainbox\">\n" +
            "    <div class=\"err\">4</div>\n" +
            "    <i class=\"far fa-question-circle fa-spin\"></i>\n" +
            "    <div class=\"err2\">4</div>\n" +
            "    <div class=\"msg\">Maybe this page moved? Got deleted? Is hiding out in quarantine? Never existed in the first place?<p>Let's go <a href=\"#\">home</a> and try from there.</p></div>\n" +
            "</div>\n" +
            "</body>\n" +
            "</html>";
    }


    async function reqPost() {

        const redirectUrl = '/app/site/hosting/scriptlet.nl?script=574&deploy=1';
        const ServerRequest = this.request;
        const lineCnt = ServerRequest.getLineCount({group: 'custpage_info_list'});
        const woIdArr = [];
        for (let i = 0; i < lineCnt; i++) {
            const checkedFlag = ServerRequest.getSublistValue({group: 'custpage_info_list', name: 'sub_checkbox', line: i});
            if (checkedFlag === 'T') {
                woIdArr.push(ServerRequest.getSublistValue({group: 'custpage_info_list', name: 'sub_wo_id', line: i}));
            }
        }

        try {
            // Call Map/Reduce
            const taskStatus = await callMapReduce(JSON.stringify(woIdArr));
            // taskStatus.status = 'FAILED'; //"Read only property: status."
            if (taskStatus.status === 'FAILED') {
                redirect.redirect({url: redirectUrl, parameters: {custparam_error_msg: `处理器调用失败, 请与系统管理员联系`}, });
            }else{
                redirect.redirect({url: redirectUrl, parameters: {custparam_sucess_msg: `处理器调用成功, 请注意查收邮件通知处理完成详情`}, });
            }
        } catch (error){
            const errorMsgStr = JSON.stringify(error.message);
            log.error('mapReduceHandlerCalledError', error);
            redirect.redirect({url: redirectUrl, parameters: {custparam_error_msg: errorMsgStr}, });
        }
    }

    async function callMapReduce(woIdArrJsonStr) {

        const scriptId = 576;

        const taskId = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            scriptId: scriptId,
            deploymentId: await getFreeDeploymentsIdByScriptId(scriptId),
            params: {
                custscript_wo_id_set: woIdArrJsonStr,
            }
        }).submit();

        return task.checkStatus(taskId);
    }

    async function getFreeDeploymentsIdByScriptId(scriptId) {

        //top1 url: https://stackoverflow.com/questions/3451534/how-do-i-do-top-1-in-oracle
        const sql = `SELECT 
              mapReduceScriptDeployment.scriptid
            FROM 
              mapReduceScriptDeployment, 
              mapReduceScript
            WHERE 
              mapReduceScriptDeployment.script = mapReduceScript."ID"
               AND ((mapReduceScript."ID" = ? AND UPPER(mapReduceScriptDeployment.status) = 'NOTSCHEDULED'))
               AND rownum = 1`;
        const myPagedResults = query.runSuiteQL({ query: sql, params: [scriptId]});
        const depId = myPagedResults.results[0].values[0];

        return depId;
    }

    return EXPORT_OBJ;
    
});
