//先頭のセミコロンは取らないでください
; (function (global, $) {
  'use strict';
  var cardMain = {};//名前空間を定義

  //カードのパラメータ
  cardMain.params = {
    numOfCardType: 44, //カードの種類は44枚
    numOfCards: 44, //表示するカードの枚数
    cardsRadius: 150, //カードの軌道の半径
    moveInterval: 30, //カード動作間隔(ミリ秒)
    timerId: 0, //回転タイマID
    cards: [],//カード毎のパラメータ管理配列
  };

  /**
   * カードオブジェクト
   *
   * @param {*} $card カードのJqueryオブジェクト
   * @param {number} outerAngle (外周)カード位置(角度)
   * @param {number} outerSpeed (外周)移動スピード(角度)
   * @param {number} ownAngle カードの傾き角度
   * @param {number} ownSpeed カード回転スピード(角度)
   */
  cardMain.Card = function ($card, outerAngle, outerSpeed, ownAngle, ownSpeed) {
    this.$card = $card;//カードのJqueryオブジェクト
    this.outer = {
      angle: outerAngle,//(外周)カード位置(角度)
      speed: outerSpeed//(外周)移動スピード(角度)
    };
    this.own = {
      angle: ownAngle,//カードの傾き角度
      speed: ownSpeed//カード回転スピード(角度)
    }
  };

  /**
   * カード移動(回転)関数
   *
   */
  cardMain.moveCards = function () {
    for (var i = 0; i < cardMain.params.numOfCards; i++) {
      var card = cardMain.params.cards[i];
      //円軌道をさせる
      card.outer.angle += card.outer.speed;
      card.$card.css({
        left: (cardMain.params.cardsRadius * Math.cos(card.outer.angle * Math.PI / 180)) + 'px',
        top: (cardMain.params.cardsRadius * Math.sin(card.outer.angle * Math.PI / 180)) + 'px'
      });
      //カードを回転させる
      card.own.angle += card.own.speed;
      card.$card.rotate(card.own.angle);
    }
  };

  /**
   * カードクリック時イベント
   * カードをめくり、占い結果テキストを表示する
   * @param {*} event クリックイベント発生源
   */
  cardMain.cardClick = function (event) {
    //クリックイベントクリア
    $("#card").off('click', 'li', cardMain.cardClick);
    //選択したカード
    var $selectedCard = $(event.currentTarget);
    clearInterval(cardMain.params.timerId); //moveCards()を停止
    $selectedCard.rotate({ animateTo: 0 }); //選択したカードの角度を0°まで回す

    var flipMiliSec = 1000;//カードめくりミリ秒(適当)
    var cardNo = cardMain.getRandomNo(cardMain.params.numOfCardType);//カード番号はその場で決める
    $.when(
      $("#card li").filter(function (i, elem) {
        return !$selectedCard.is($(elem));
      }).animate({ opacity: "0" }, 1500),//選択したカード以外の透明度を0に
      $selectedCard.animate({ top: "-100px", left: "61px" }, 3000) //選択したカードを中心へ(ul幅-画像幅/2)
    ).then(function ($others, $card) {
      return $.when(
        $card.children("img").animate({ width: "0", height: "256px" }, flipMiliSec),//カードを閉じる
        $card.animate({ left: "150px" }, flipMiliSec)//ulの幅の半分
      );
    }).then(function ($img, $card) {
      var d = $.Deferred();
      $img.on('load', d.resolve.bind(this, $img, $card));//カード画像読込待機
      $img.attr("src", "image/card" + (cardNo - 1) + ".png");
      return d.promise();
    }).then(function ($img, $card) {
      var queryParams = cardMain.getQuery();
      var kind = "baseMessage";
      if (queryParams != null && queryParams.kind != null) {
        kind = queryParams.kind;
      }
      return $.when(
        $img.animate({ width: "300px", height: "300px" }, flipMiliSec),//カードを開く
        $card.animate({ left: "0" }, flipMiliSec),
        $.getJSON("message/" + kind + ".json")
      );
    }).then(function ($img, $card, jsonData) {
      var text = "";
      if (jsonData != null && jsonData.length > 0 && jsonData[0] != null) {
        var targetData = jsonData[0].filter(function (item, index) {
          return item.id === cardNo;
        });
        if (targetData.length > 0) {
          text = targetData[0].text;
        }
      }
      $card.children("p[name='text']").text(text);//メッセージを表示
    }, function (err) {
      console.log(err);
      alert("何らかのエラーが発生しました。");
    });
  };

  /**
   * 指定した範囲でランダムな正の整数を取得する
   *
   * @param {number} maxVal
   * @param {number} [minVal=1]
   * @returns
   */
  cardMain.getRandomNo = function (maxVal, minVal = 1) {
    if (minVal > maxVal) {
      return maxVal;
    }
    var baseVal = (minVal - 1);
    return Math.round(baseVal + Math.random() * (maxVal - baseVal) + 0.5);
  };

  /**
   * URLパラメータを取得する
   *
   * @returns パラメータオブジェクト(連想配列)
   */
  cardMain.getQuery = function () {
    if (window.location.search === "") return;
    var variables = window.location.search.split("?")[1].split("&");
    var obj = {};
    variables.forEach(function (v, i) {
      var variable = v.split("=");
      obj[variable[0]] = variable[1];
    });
    return obj;
  };

  //ドキュメントロード時イベント
  $(function () {
    for (var i = 0; i < cardMain.params.numOfCards; i++) {
      cardMain.params.cards[i] = new cardMain.Card(
        $("<li data-id='" + i + "'><img src='image/card.png'><p name='text'></p></li>").appendTo($("#card")),//#card配下にカード画像の入ったliタグの生成
        cardMain.getRandomNo(360),//外周初期位置(1~360)
        cardMain.getRandomNo(3),//外周速度(1~3)
        cardMain.getRandomNo(360),//カード初期傾き角度(1~360)
        cardMain.getRandomNo(30, 5)//カード回転スピード(5~30)
      );
    }
    //回転タイマ開始
    cardMain.params.timerId = setInterval(cardMain.moveCards, cardMain.params.moveInterval);
    //カードクリックイベント
    $("#card").on('click', 'li', cardMain.cardClick);
  });

}(this, jQuery));
