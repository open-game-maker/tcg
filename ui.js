({
    //カードの種類
    NUMBER_OF_CARD: 3,

    /**
     * プレイヤーID
     */
    playerId: -1,

    /**
     * すでに選択したデッキのカードの枚数
     */
    selectionIndex: 0,
    /**
     * チャットの長さ
     */
    mPrevChatLength: 0,
    /**
     * デッキに追加するカード枚数
     */
    numberOfAddCard: 0,

    /**
     * 手札
     */
    shareStateHand: null,
    /**
     * HP
     */
    shareStateHP: null,
    /**
     * プレイヤーの状態
     */
    shareStatePlayerState: null,

    /**
     * 画面にUIを表示する
     * @param {*} ui 汎用関数
     * @param {*} chat プレイヤーに送信されているチャット
     */
    drawCurrent: function(ui, chat, width, height, completeShareState) {
        //画面の初期化
        ui.init()

        //クリック時の関数でthisを使用するために変数として持つ
        var thisObj = this
        //描画のビューのID用のカウンタ
        var idCount = 0;
        
        //チャットで取得したゲームの状態を変数として保持する
        for (var index = chat.length - 1; index >= this.mPrevChatLength; index--) {
            var constraintsKey = chat[index].rawBody.constraintsKey;
            var signalId = chat[index].rawBody.signalId;
            var shareIndexList = chat[index].rawBody.shareIndexList;
            if (signalId == -1) {
                //プレイヤーのIDをセット
                this.playerId = chat[index].rawBody.signal
            }
            if (constraintsKey == 0) {
                //デッキにカードを加える処理の描画のための準備
                this.numberOfAddCard += 1;
            }
            else if (ui.equal(shareIndexList, [0,2,this.playerId])) {
                //手札の表示
                this.numberOfAddCard = 0
                this.shareStateHand = chat[index].rawBody.shareState;
            }
            else if (ui.equal(shareIndexList, [0,0])) {
                //HPの表示
                this.shareStateHP = chat[index].rawBody.shareState;
            }
            else if (ui.equal(shareIndexList, [0,4])) {
                //プレイヤーの状態の表示
                this.shareStatePlayerState = chat[index].rawBody.shareState;
            }
        }

        if (this.selectionIndex < this.numberOfAddCard) {
            //デッキにカードを加える選択権がある場合、デッキにカードを加える処理の描画用のビューを設定
            var card = ui.gameScript.selectionConstraintsList[0].createAll(ui.cgp, completeShareState, null)
            for (var count = 0; count < card.length; count++) {
                ui.register(idCount, 5 + count * 35, 40, 30, 30);
                ui.addFillRect(idCount, "lightgray");
                ui.addFillText(idCount, "black", " " + ui.deepCopy(card[count][0]) + " ", null);
                ui.setOnClickListener(idCount, ui.deepCopy(count), function(obj){
                    if (thisObj.selectionIndex < thisObj.numberOfAddCard) {
                        ui.sendSlectionChat(thisObj.selectionIndex, null, obj, null)
                        thisObj.selectionIndex++
                    }
                })
                idCount++;
            }

            ui.register(idCount, 5, 5, 200, 30);
            ui.pushFillText(idCount, {color: "black", text: "残り枚数" + (this.numberOfAddCard - thisObj.selectionIndex), textAlign: "left"});
            idCount++;
        }
        else {
            var CARD_HEIGHT = 80
            var STATE_CARD_SIZE = 40
            var SUB_STATE_CARD_SIZE = 15
            var MARGINE = 5

            //手札の描画用のビューを設定
            for (var count = 0; count < this.shareStateHand.length; count++) {
                ui.register(idCount, 5 + count * 35, CARD_HEIGHT + MARGINE, 30, 30);
                ui.addFillRect(idCount, "lightgray");
                ui.addFillText(idCount, "black", " " + ui.deepCopy(this.shareStateHand[count]) + " ", null);
                ui.setOnClickListener(idCount, ui.deepCopy(count), function(obj){
                    ui.sendSlectionChat(0, null, obj, null)
                })
                idCount++;
            }

            //HPの描画用のビューを設定
            ui.register(idCount, 5, 5, 150, 30);
            ui.addFillRect(idCount, "lightgray");
            ui.addFillText(idCount, "black", (this.playerId == 0 ? "あなた" : "あいて") + "のHP:" + ui.deepCopy(this.shareStateHP[0]), null);
            idCount++;
            ui.register(idCount, 160, 5, 150, 30);
            ui.addFillRect(idCount, "lightgray");
            ui.addFillText(idCount, "black", (this.playerId == 0 ? "あいて" : "あなた") + "のHP:" + ui.deepCopy(this.shareStateHP[1]), null);
            idCount++;

            //状態変化の描画用のビューを設定
            for (var i = 0; i < this.shareStatePlayerState.length; i++) {
                for (var i2 = 0; i2 < this.shareStatePlayerState[i].length; i2++) {
                    ui.register(idCount, 5 + 155 * i + (i2 * (STATE_CARD_SIZE + MARGINE)), STATE_CARD_SIZE, STATE_CARD_SIZE, STATE_CARD_SIZE);
                    ui.addFillRect(idCount, "lightgray");
                    ui.addFillText(idCount, "black", " " + this.shareStatePlayerState[i][i2][0] + " ", null);
                    idCount++;

                    ui.register(idCount, 5 + 155 * i + (i2 * (STATE_CARD_SIZE + MARGINE)), STATE_CARD_SIZE, SUB_STATE_CARD_SIZE, SUB_STATE_CARD_SIZE);
                    ui.addFillRect(idCount, "lightgray");
                    ui.addFillText(idCount, "black", " " + ((this.shareStatePlayerState[i][i2][1] == -1) ? "∞" : this.shareStatePlayerState[i][i2][1]) + " ", null);
                    idCount++;

                    ui.register(idCount, 5 + 155 * i + STATE_CARD_SIZE - SUB_STATE_CARD_SIZE + (i2 * (STATE_CARD_SIZE + MARGINE)), STATE_CARD_SIZE, SUB_STATE_CARD_SIZE, SUB_STATE_CARD_SIZE);
                    ui.addFillRect(idCount, "lightgray");
                    ui.addFillText(idCount, "black", " " + this.shareStatePlayerState[i][i2][2] + " ", null);
                    idCount++;
                }
            }
        }

        //新しいチャットのみを処理するため、前回のチャットのサイズを持っておく
        this.mPrevChatLength = chat.length

        //画面を描画
        ui.show();
    },

    /**
     * Canvas要素をクリックしたときのイベント
     * @param ui 汎用関数
     * @param {*} pageX キャンバスの左端からクリック位置まで距離
     * @param {*} pageY キャンバスの上端からクリック位置まで距離
     */
    onClick: function(ui, pageX, pageY) {
        //クリックした位置に存在するviewのリストを取得
        var ids = ui.getViews(pageX, pageY);
        ui.execViewProcess(ids);
    }
})