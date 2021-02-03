/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 *
 * Version    Date          Author      Action      Remarks
 * 1.0        20201224      Tyrion      Create      Mark Work Orders Released
 *            20201229                  Deploy
 *
 * scriptURL: 
 * scriptDebuggerUrl: 
 *
 */
define(['N/runtime', 'N/record', ],
/**
 * @param{runtime} runtime
 * @param{record} record
 */
function(runtime, record, ) {
   
    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function getInputData() {

        log.debug('getInputDataCalled', 'Task Begin');

        const woIdArr = JSON.parse(runtime.getCurrentScript().getParameter({name: 'custscript_wo_id_set'}));

        return woIdArr;
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {

        // 为什么不使用submitFields, 风险担忧, 仅此. 未测试.
        const woId = context.value;
        const woStatusRecObj = { woId, taskFlag: true, failureDetail: '', };
        const woRec = record.load({type: 'workorder', id: woId});
        woRec.setValue({fieldId: 'orderstatus', value: 'B'});
        try {
            woRec.save();
        }catch(error){
            log.error('woSavedError', woId);
            woStatusRecObj.taskFlag = false;
            woStatusRecObj.failureDetail = error.message;
        }
        createWoStatusRecByWoId(woStatusRecObj);
    }

    function createWoStatusRecByWoId(woStatusRecObj) {

        const newRec = record.create({
            type: 'customrecord_wo_status_update_check',
        });
        newRec.setValue({fieldId: 'custrecord_wo_id', value: woStatusRecObj.woId});
        // newRec.setValue({fieldId: 'custrecord_task_type', value: woId}); //扩展: 添加任务类型, 当前默认为'标记工单为已发放';
        newRec.setValue({fieldId: 'custrecord_task_success_flag', value: woStatusRecObj.taskFlag});//true
        !woStatusRecObj.taskFlag && newRec.setValue({fieldId: 'custrecord_failure_detail', value: woStatusRecObj.failureDetail});

        try {
            newRec.save();
        } catch (error){
            log.error('createWoStatusRecByWoIdError', JSON.stringify(error));
        }

    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {

    }


    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {

        log.debug('summarize Called', 'Task End');
    }

    return {
        getInputData: getInputData,
        map: map,
        // reduce: reduce,
        summarize: summarize
    };
    
});
