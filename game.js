({
    //先攻後攻のないTCG
    
    //定数
    staticValue: {
        //stateのインデックスに使用する定数
        LIFE: 0,
        DECK: 1,
        HAND: 2,
        SELECT_CARD: 3,
        PLAYERS_STATE: 4,

        //選択肢の制約のインデックス
        SELECTION_INDEX_ADD_CARD: 0,
        SELECTION_INDEX_SELECT_CARD: 1,

        //ゲームの情報を送信におけるID
        SIGNAL_ID_SELECT: 0,

        //プレイヤーの状態変化のインデックス
        PLAYER_STATE_INDEX_PLAYER_STATE_ID: 0,
        PLAYER_STATE_INDEX_TURN: 1,
        PLAYER_STATE_INDEX_EFFECT: 2,

        //カードのID
        CARD_ID_GUARD: 0,
        CARD_ID_ATTACK: 1,
        CARD_ID_CHARGE: 2,

        //状態変化のID
        PLAYER_STATE_GUARD: 0,
        PLAYER_STATE_NO_GUARD: 1,
        PLAYER_STATE_CHARGE: 2
    },
    
    //プレイヤー数
    numberOfPlayer: [2],

    /**
     * ゲームの初期化処理
     * @param {*} ogm 汎用関数
     * @param {*} random 乱数生成
     * @param {*} rule ルール
     */
    initialize: function(ogm, random, rule) {
        //ゲームの状態
        //0: 各プレイヤのライフ, 1: デッキのカード, 2: 手札のカード, 3: 選択されたカード, 4: プレイヤーの属する状態変化
        var state = [[30, 30], [[],[]], [[],[]], [[],[]], [[],[]]];

        //選択の情報をプレイヤーに送信
        var selections = ogm.newArray(2);
        //デッキの作成のための選択
        for (var playerIndex = 0; playerIndex < ogm.numberOfPlayer; playerIndex++) {
            for (var i = 0; i < 10; i++) {
                selections[playerIndex].push(ogm.createPlayerSelect(this.staticValue.SELECTION_INDEX_ADD_CARD, this.staticValue.SELECTION_INDEX_ADD_CARD, null));
            } 
        }

        //ゲーム状態をプレイヤーに共有する
        var shares = ogm.newArray(ogm.numberOfPlayer);
        for (var playerIndex = 0; playerIndex < ogm.numberOfPlayer; playerIndex++) {
            //各プレイヤーのHP
            shares[playerIndex].push([ogm.STATE, this.staticValue.LIFE]);
            //自分の手札　
            shares[playerIndex].push([ogm.STATE, this.staticValue.HAND, playerIndex]);
            //選択されたカード
            shares[playerIndex].push([ogm.STATE, this.staticValue.SELECT_CARD]);
            //各プレイヤーのプレイヤーの属する状態変化
            shares[playerIndex].push([ogm.STATE, this.staticValue.PLAYERS_STATE]);
        }

        //ゲームの情報をプレイヤーに送信する
        var signal = ogm.newArray(ogm.numberOfPlayer);
        for (var index = 0; index < ogm.numberOfPlayer; index++) {
            //プレイヤーIDを送る（シグナルIDの-1番目をプレイヤーIDを送る用とする）
            signal[index].push([ogm.PLAYER_ID_SIGNAL_ID, index]);
            //プレイヤー数を送る（シグナルIDの-2番目をプレイヤー数を送る用とする）
            signal[index].push([ogm.PLSYER_NUMBER_SIGNAL_ID, ogm.numberOfPlayer]);
        }

        //処理結果を返す
        return ogm.createGameNextResult(
            state,
            selections,
            shares,
            null,
            signal,
            null
        );
    },
    /**
     * ゲームの次状態の生成
     * @param {*} ogm 汎用関数
     * @param {*} random 乱数生成
     * @param {*} state ゲームの状態
     * @param {*} selectList プレイヤーの選択
     */
    next: function(ogm, random, state, selectList) {
        //staticValueをfunction内で使用するための変数
        var thisStaticValue = this.staticValue;

        var isAddCard = false;

        //全プレイヤーの選択を処理
        for (var playerIndex = 0; playerIndex < ogm.numberOfPlayer; playerIndex++) {
            for (var selectIndex = 0; selectIndex < selectList[playerIndex].length; selectIndex++) {
                var playerSelect = selectList[playerIndex][selectIndex].playersSelection;
                if (selectList[playerIndex][selectIndex].selection.constraintsKey == this.staticValue.SELECTION_INDEX_ADD_CARD) {
                    //ゲームの始めにデッキにカードを加える
                    state[this.staticValue.DECK][playerIndex].push(playerSelect);
                    isAddCard = true;
                }
                else if (selectList[playerIndex][selectIndex].selection.constraintsKey == this.staticValue.SELECTION_INDEX_SELECT_CARD) {
                    //手札から選択したカードを取り出す
                    if (playerSelect >= 0) {
                        var selectCardId = state[this.staticValue.HAND][playerIndex].splice(playerSelect, 1);
                        if (selectCardId) {
                            state[this.staticValue.SELECT_CARD][playerIndex].push(selectCardId);
                        }
                    }
                }
            }
        }
        
        //ガードなどの実行
        for (var playerIndex = 0; playerIndex < ogm.numberOfPlayer; playerIndex++) {
            for (var selectiIndex = 0; selectiIndex < state[this.staticValue.SELECT_CARD][playerIndex].length; selectiIndex++) {
                if (state[this.staticValue.SELECT_CARD][playerIndex][selectiIndex] == this.staticValue.CARD_ID_GUARD) {
                    var found = state[this.staticValue.PLAYERS_STATE][playerIndex].find(function(element) {
                        return element[thisStaticValue.PLAYER_STATE_INDEX_PLAYER_STATE_ID] == thisStaticValue.PLAYER_STATE_GUARD;
                    });
                    if (found == null) {
                        state[this.staticValue.PLAYERS_STATE][playerIndex].push([this.staticValue.PLAYER_STATE_GUARD, 0, 1]);
                    }
                }
            }
        }

        //攻撃などの実行
        for (var playerIndex = 0; playerIndex < ogm.numberOfPlayer; playerIndex++) {
            for (var selectiIndex = 0; selectiIndex < state[this.staticValue.SELECT_CARD][playerIndex].length; selectiIndex++) {
                if (state[this.staticValue.SELECT_CARD][playerIndex][selectiIndex] == this.staticValue.CARD_ID_ATTACK) {
                    //攻撃を使用している場合
                    //相手にガードが付与されていないか検索する
                    var found = state[this.staticValue.PLAYERS_STATE][this.convertPlayerId(playerIndex)].find(function(element) {
                        return element[thisStaticValue.PLAYER_STATE_INDEX_PLAYER_STATE_ID] == thisStaticValue.PLAYER_STATE_GUARD;
                    });
                    if (found == null) {
                        //相手にガードが付与されていない場合、攻撃できる
                        var found2 = state[this.staticValue.PLAYERS_STATE][playerIndex].find(function(element) {
                            return element[thisStaticValue.PLAYER_STATE_INDEX_PLAYER_STATE_ID] == thisStaticValue.PLAYER_STATE_CHARGE;
                        });
                        //攻撃のダメージ
                        var ATTACK_DAMAGE = 5;
                        if (found2 != null) {
                            //チャージした分、攻撃力を上昇させて攻撃を行う
                            state[this.staticValue.LIFE][this.convertPlayerId(playerIndex)] -= ATTACK_DAMAGE * found2[2];
                        }
                        else {
                            //通常の攻撃を行う
                            state[this.staticValue.LIFE][this.convertPlayerId(playerIndex)] -= ATTACK_DAMAGE;
                        }
                    }
                    var foundIndex = state[this.staticValue.PLAYERS_STATE][playerIndex].findIndex(function(element) {
                        return element[thisStaticValue.PLAYER_STATE_INDEX_PLAYER_STATE_ID] == thisStaticValue.PLAYER_STATE_CHARGE;
                    });
                    if (foundIndex >= 0) {
                        //チャージ状態がすでに付与されている場合、その状態を除く
                        state[this.staticValue.PLAYERS_STATE][playerIndex].splice(foundIndex, 1);
                    }
                }
            }
        }

        //プレイヤーの状態のターン経過処理
        for (var playerIndex = 0; playerIndex < ogm.numberOfPlayer; playerIndex++) {
            //継続ターンを1減らす
            for (var playerStateIndex = 0; playerStateIndex < state[this.staticValue.PLAYERS_STATE][playerIndex].length; playerStateIndex++) {
                if (state[this.staticValue.PLAYERS_STATE][playerIndex][playerStateIndex][this.staticValue.PLAYER_STATE_INDEX_TURN] > 0) {
                    state[this.staticValue.PLAYERS_STATE][playerIndex][playerStateIndex][this.staticValue.PLAYER_STATE_INDEX_TURN] -= 1;
                }
            }
            //状態の継続ターンが終了していないもののみを残す
            var result = state[this.staticValue.PLAYERS_STATE][playerIndex].filter(function(element) {
                return element[thisStaticValue.PLAYER_STATE_INDEX_TURN] != 0;
            })
            state[this.staticValue.PLAYERS_STATE][playerIndex] = result;
        }

        //チャージなどの実行
        for (var playerIndex = 0; playerIndex < ogm.numberOfPlayer; playerIndex++) {
            for (var selectiIndex = 0; selectiIndex < state[this.staticValue.SELECT_CARD][playerIndex].length; selectiIndex++) {
                if (state[this.staticValue.SELECT_CARD][playerIndex][selectiIndex] == this.staticValue.CARD_ID_GUARD) {
                    //次回ガードを使用できない状態を付与
                    state[this.staticValue.PLAYERS_STATE][playerIndex].push([this.staticValue.PLAYER_STATE_NO_GUARD, 1, 1]);
                }
                else if (state[this.staticValue.SELECT_CARD][playerIndex][selectiIndex] == this.staticValue.CARD_ID_CHARGE) {
                    //チャージ状態を付与
                    var foundIndex = state[this.staticValue.PLAYERS_STATE][playerIndex].findIndex(function(element) {
                        return element[thisStaticValue.PLAYER_STATE_INDEX_PLAYER_STATE_ID] == thisStaticValue.PLAYER_STATE_CHARGE;
                    });
                    if (foundIndex >= 0) {
                        //チャージ状態がすでに付与されている場合、攻撃力をさらに2倍する
                        var charge = state[this.staticValue.PLAYERS_STATE][playerIndex].splice(foundIndex, 1);
                        state[this.staticValue.PLAYERS_STATE][playerIndex].push([this.staticValue.PLAYER_STATE_CHARGE, -1, charge[0][this.staticValue.PLAYER_STATE_INDEX_EFFECT] * 2]);
                    }
                    else {
                        //チャージ状態を付与する（-1は継続ターンが無限であることを表す、2は攻撃力を2倍することを表す）
                        state[this.staticValue.PLAYERS_STATE][playerIndex].push([this.staticValue.PLAYER_STATE_CHARGE, -1, 2]);
                    }
                }
            }
        }

        var selectCards = [];

        //選択されていたカードをプレイヤーに送信する
        for (var playerIndex = 0; playerIndex < ogm.numberOfPlayer; playerIndex++) {
            selectCards.push(ogm.deepCopy(state[this.staticValue.SELECT_CARD][playerIndex]));
        }

        //選択を初期化
        for (var playerIndex = 0; playerIndex < ogm.numberOfPlayer; playerIndex++) {
            state[this.staticValue.SELECT_CARD][playerIndex] = [];
        }

        //敗北したプレイヤーのIDを入れる配列
        var losePlayer = [];
        if (isAddCard) {
            //ゲームの始めにカードを加えた場合、山札をシャッフルする
            ogm.shuffle(random, state[this.staticValue.DECK][0]);
            ogm.shuffle(random, state[this.staticValue.DECK][1]);

            //ゲームの始めに手札に加えるカードの枚数
            var NUMBER_OF_CARDS_IN_HAND = 3;
            //山札から手札にカードを加える
            for (var playerIndex = 0; playerIndex < ogm.numberOfPlayer; playerIndex++) {
                for (var i = 0; i < NUMBER_OF_CARDS_IN_HAND; i++) {
                    state[this.staticValue.HAND][playerIndex].push(state[this.staticValue.DECK][playerIndex].pop());
                }
            }
        }
        else {
            //互いに1枚カードを引く
            for (var playerIndex = 0; playerIndex < ogm.numberOfPlayer; playerIndex++) {
                if (state[this.staticValue.DECK][playerIndex].length > 0) {
                    //山札にまだカードがある場合、そこから1枚引く
                    state[this.staticValue.HAND][playerIndex].push(state[this.staticValue.DECK][playerIndex].pop());
                }
                else {
                    //手札が加えられない場合、敗北プレイヤーに加える
                    losePlayer.push(playerIndex);
                }
            }
        }

        //HPが一定以下のプレイヤーを敗北とする
        for (var i = 0; i < state[this.staticValue.LIFE].length; i++) {
            if (state[this.staticValue.LIFE][i] <= 0) {
                losePlayer.push(ogm.deepCopy(i));
            }
        }

        //ゲームの勝者を表す変数（nullの場合はゲームは続く）
        var winnerSet = null;
        if (losePlayer.length > 0) {
            //敗北プレイヤーの配列に要素が追加されている場合、ゲーム終了。勝利プレイヤーに1、敗北プレイヤーに0をセットする
            winnerSet = [1, 1];
            for (var i = 0; i < losePlayer.length; i++) {
                winnerSet[losePlayer[i]] = 0;
            }
        }

        //選択の情報をプレイヤーに送信
        var selections = ogm.newArray(ogm.numberOfPlayer);
        for (var playerIndex = 0; playerIndex < ogm.numberOfPlayer; playerIndex++) {
            selections[playerIndex].push(ogm.createPlayerSelect(this.staticValue.SELECTION_INDEX_SELECT_CARD, this.staticValue.SELECTION_INDEX_SELECT_CARD, null));
        }
        
        //ゲーム状態をプレイヤーに共有する
        var shares = ogm.newArray(ogm.numberOfPlayer);
        for (var playerIndex = 0; playerIndex < ogm.numberOfPlayer; playerIndex++) {
            //各プレイヤーのHP
            shares[playerIndex].push([ogm.STATE, this.staticValue.LIFE]);
            //自分の手札　
            shares[playerIndex].push([ogm.STATE, this.staticValue.HAND, playerIndex]);
            //選択されたカード
            shares[playerIndex].push([ogm.STATE, this.staticValue.SELECT_CARD]);
            //各プレイヤーのプレイヤーの属する状態変化
            shares[playerIndex].push([ogm.STATE, this.staticValue.PLAYERS_STATE]);
        }

        //ゲームの情報をプレイヤーに送信する
        var signal = ogm.newArray(ogm.numberOfPlayer);
        for (var index = 0; index < ogm.numberOfPlayer; index++) {
            //プレイヤーIDを送る（シグナルIDの-1番目をプレイヤーIDを送る用とする）
            signal[index].push([ogm.PLAYER_ID_SIGNAL_ID, index]);
            //プレイヤー数を送る（シグナルIDの-2番目をプレイヤー数を送る用とする）
            signal[index].push([ogm.PLSYER_NUMBER_SIGNAL_ID, ogm.numberOfPlayer]);
            //選択されていたカードをプレイヤーに送信する
            signal[index].push(this.staticValue.SIGNAL_ID_SELECT, selectCards);
        }

        //プレイヤーの選択とゲームの状態から得られた処理結果を返す
        return ogm.createGameNextResult(
            state,
            selections,
            shares,
            null,
            signal,
            winnerSet
        );
    },
    //プレイヤーIDから相手プレイヤーIDに変換する
    convertPlayerId: function(playerId) {
        return playerId == 0 ? 1 : 0;
    },
    /**
     * 選択肢の制御
     */
    selectionConstraintsList: [
        //デッキにカードを加える処理の選択肢を生成する上での制約（SELECTION_INDEX_ADD_CARDに対応する）
        {
            staticValue: {
                //stateのインデックスに使用する定数
                LIFE: 0,
                DECK: 1,
                HAND: 2,
                SELECT_CARD: 3,
                PLAYERS_STATE: 4,
        
                //選択肢の制約のインデックス
                SELECTION_INDEX_ADD_CARD: 0,
                SELECTION_INDEX_SELECT_CARD: 1,
        
                //ゲームの情報を送信におけるID
                SIGNAL_ID_SELECT: 0,
        
                //プレイヤーの状態変化のインデックス
                PLAYER_STATE_INDEX_PLAYER_STATE_ID: 0,
                PLAYER_STATE_INDEX_TURN: 1,
                PLAYER_STATE_INDEX_EFFECT: 2,
        
                //カードのID
                CARD_ID_GUARD: 0,
                CARD_ID_ATTACK: 1,
                CARD_ID_CHARGE: 2,
        
                //状態変化のID
                PLAYER_STATE_GUARD: 0,
                PLAYER_STATE_NO_GUARD: 1,
                PLAYER_STATE_CHARGE: 2
            },
            /**
             * プレイヤーが選択できるすべての選択肢の生成
             * @param {*} ogm 汎用関数
             * @param {*} shareState プレイヤーに渡されているゲームの状態の情報
             * @param {*} selectionSignal 選択に紐づけられている情報
             */
             createAll: function(
                ogm,
                shareState,
                selectionSignal
            ) {
                var selections = [];
                //ガード
                selections.push([
                    this.staticValue.CARD_ID_GUARD, null
                ]);
                //攻撃
                selections.push([
                    this.staticValue.CARD_ID_ATTACK, null
                ]);
                //チャージ
                selections.push([
                    this.staticValue.CARD_ID_CHARGE, null
                ]);
                return selections;
            }
        },
        //手札から一枚選択して使用処理の選択肢を生成する上での制約（SELECTION_INDEX_SELECT_CARDに対応する）
        {
            staticValue: {
                //stateのインデックスに使用する定数
                LIFE: 0,
                DECK: 1,
                HAND: 2,
                SELECT_CARD: 3,
                PLAYERS_STATE: 4,
        
                //選択肢の制約のインデックス
                SELECTION_INDEX_ADD_CARD: 0,
                SELECTION_INDEX_SELECT_CARD: 1,
        
                //ゲームの情報を送信におけるID
                SIGNAL_ID_SELECT: 0,
        
                //プレイヤーの状態変化のインデックス
                PLAYER_STATE_INDEX_PLAYER_STATE_ID: 0,
                PLAYER_STATE_INDEX_TURN: 1,
                PLAYER_STATE_INDEX_EFFECT: 2,
        
                //カードのID
                CARD_ID_GUARD: 0,
                CARD_ID_ATTACK: 1,
                CARD_ID_CHARGE: 2,
        
                //状態変化のID
                PLAYER_STATE_GUARD: 0,
                PLAYER_STATE_NO_GUARD: 1,
                PLAYER_STATE_CHARGE: 2
            },
            /**
             * プレイヤーが選択できるすべての選択肢の生成
             * @param {*} ogm 汎用関数
             * @param {*} shareState プレイヤーに渡されているゲームの状態の情報
             * @param {*} selectionSignal 選択に紐づけられている情報
             */
            createAll: function(
                ogm,
                shareState,
                selectionSignal
            ) {
                var selections = [];
                var playerId = shareState.getSignal(ogm.PLAYER_ID_SIGNAL_ID)[0][1];
                var hand = shareState.getState([this.staticValue.HAND, playerId]);
                for (var i = 0; i < hand.length; i++) {
                    selections.push([
                        ogm.deepCopy(i), null
                    ]);
                }
                return selections;
            }
        }
    ]
})
