/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * Version    Date          Author      Action      Remarks
 * 1.0      20201229        Tyrion      Create      日常Client query call
 *                                                  01. getFreeDeploymentsCntByScriptId
 *         20210111         Tyrion      Update      02: getItemMOQObjById
 *         20210119         Tyrion      Update      03: getAllItemMOQObj
 *
 * scriptURL: https://4850287.app.netsuite.com/app/common/scripting/script.nl?id=577&whence=
 */
define(['N/query', 'N/cache', ],
/**
 * @param{query} query
 * @param{cache} cache
 */
function(query, cache, ) {
    const EXPORT_OBJ = {
        onRequest: onRequest
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

    function reqPost() {

        const bodyParams = JSON.parse(this.request.body);
        const funcName = bodyParams.func;
        const paramsArr = bodyParams.params;

        const triggerRouter = {};
        triggerRouter['getFreeDeploymentsCntByScriptId'] = getFreeDeploymentsCntByScriptId;
        triggerRouter['getItemMOQObjById'] = getItemMOQObjById;
        triggerRouter['getAllItemMOQObj'] = getAllItemMOQObj;
        triggerRouter['getPOPrincipleObj'] = getPOPrincipleObj;
        triggerRouter['getSupplyListMOQObj'] = getSupplyListMOQObj;
        triggerRouter.hasOwnProperty(funcName) && triggerRouter[funcName].apply(this, [...paramsArr]);
    }

    const CACHE_PO_PRINCIPLE = 'cachePOPrincipleObj';
    function getPOPrincipleObj() {

        log.debug('getPOPrincipleObjCalled', 'hello');
        const ItemMOQCache = cache.getCache({
            name: CACHE_PO_PRINCIPLE,
            scope: cache.Scope.PRIVATE,
        });
        const poPrincipleStr = ItemMOQCache.get({
            key: 'poPrinciple',
            loader: queryPoPrincipleObj,
            ttl: 60 * 60 * 12,
        });
        this.response.write(poPrincipleStr);
    }

    function queryPoPrincipleObj() {

        log.debug('queryPoPrincipleObjCalled', 'cachePoPrinciple');

        const sql = `
            SELECT
                c.custrecord_po_allow_update_vendors AS vendor,
                c.custrecord_po_allow_update_rate AS plm
            FROM customrecord_rules_list c
            WHERE 
                c.id = 1`;
        const resultArr = query.runSuiteQL({query: sql}).asMappedResults();
        const vendorArr = resultArr[0].vendor.split(',').map(item=>item.trim());
        const plmCodeArr = resultArr[0].plm.split(',').filter(item=>!!item).map(item=>item.trim());
        return JSON.stringify({ poPrinciple: {vendorArr, plmCodeArr }});

    }

    const CACHE_ITEM_MOQ = 'cacheItemMOQObj';
    function getAllItemMOQObj() {

        log.debug('getAllItemMOQObjCalled', 'hello');
        const ItemMOQCache = cache.getCache({
            name: CACHE_ITEM_MOQ,
            scope: cache.Scope.PRIVATE,
        });
        const itemMOQStr = ItemMOQCache.get({
            key: 'itemMOQ',
            loader: queryAllItemMOQObj,
            ttl: 60 * 60 * 24,
        });
        this.response.write(itemMOQStr);
    }



    function queryAllItemMOQObj() {

        log.debug('queryAllItemMOQObjCalled', 'cacheProducted');

        const sql = `SELECT item.id, item.custitem9 FROM item 
            WHERE 
                item.custitem9 > 0
                AND item.itemtype IN ('InvtPart', 'Assembly')`;
        const resultArr = query.runSuiteQL({query: sql}).asMappedResults();
        const resultObj = {};
        resultArr.forEach(item => {
            resultObj[item.id] = item.custitem9;
        });
        return JSON.stringify({itemMOQ: resultObj});
    }


    const CACHE_SUPPLY_LIST_MOQ = 'cacheSupplyListMOQ';
    function getSupplyListMOQObj() {

        log.debug('getAllItemMOQObjCalled', 'hello');
        const ItemMOQCache = cache.getCache({
            name: CACHE_SUPPLY_LIST_MOQ,
            scope: cache.Scope.PRIVATE,
        });
        const itemMOQStr = ItemMOQCache.get({
            key: 'itemMOQ',
            loader: querySupplyListMOQObj,
            ttl: 60 * 60 * 24,
        });
        this.response.write(itemMOQStr);
    }

    function querySupplyListMOQObj() {

        log.debug('querySupplyListMOQObjCalled', 'hello');
        const sql = `
            SELECT
                c.custrecord_hz_supply_item_code AS id,
                MIN(c.custrecord_moq) AS qty,
            FROM
            customrecord_hz_supply_list AS c
            WHERE c.custrecord_moq>0
            AND c.custrecord_hz_supply_validate = 'T'
            group by c.custrecord_hz_supply_item_code
        `;
        const resultArr = query.runSuiteQL({query: sql}).asMappedResults();
        const resultObj = {};
        resultArr.forEach(item => {
            resultObj[item.id] = item.qty;
        });
        return JSON.stringify({itemMOQ: resultObj});
    }



    function reqGet() {

    }

    function getItemMOQObjById(itemId) {

        let itemMOQ = 0;
        const sql = `SELECT item.custitem9, item.itemtype FROM item WHERE item.id = ?`;
        const resultArr = query.runSuiteQL({query: sql, params: [itemId]}).asMappedResults();
        !!resultArr.length && !!resultArr[0].custitem9 && (itemMOQ = Number(resultArr[0].custitem9));

        const ItemMOQObj =  {
            itemType: resultArr[0].itemtype,
            itemMOQ: itemMOQ,
        };
        this.response.write(JSON.stringify(ItemMOQObj));
    }


    function getFreeDeploymentsCntByScriptId(scriptId) {

        // 单元素则尾部括号会有影响
        const sql = `SELECT 
              COUNT(mapReduceScriptDeployment.scriptid)
            FROM 
              mapReduceScriptDeployment, 
              mapReduceScript
            WHERE 
              mapReduceScriptDeployment.script = mapReduceScript."ID"
               AND ((mapReduceScript."ID" = ? AND UPPER(mapReduceScriptDeployment.status) = 'NOTSCHEDULED'))`;
        const myPagedResults = query.runSuiteQL({ query: sql, params: [scriptId]});
        const freeDepCnt = myPagedResults.results[0].values[0];

        return this.response.write(JSON.stringify(freeDepCnt));
    }

    return EXPORT_OBJ;
    
});
