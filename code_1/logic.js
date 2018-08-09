$(document).ready(function(){
  const staticValues = { gender: { male: 0.73, female: 0.66 }, drinks: { wine: 0.9, beer: 0.84, cocktail: 1.2, shot: 0.6 } }; //object with constants
  let userInfo = {startDrink: null, status: 0, currentBAC: 0, name: null, weight: null, gValue: null, userPhoneNumber: null, helpPhoneNumber: null}; //user info object
  let sessionDrinks, timer, clicked = false;
  let namesLS = {userName: 'userName', sessionDrinks: 'sessionDrinks'}; //names for ls

  let config = {
    apiKey: "AIzaSyCFpQD6ZlX-nUF6f6kbwLNtecN7rSgnnjk",
    authDomain: "learntochecktime.firebaseapp.com",
    databaseURL: "https://learntochecktime.firebaseio.com",
    projectId: "learntochecktime",
    storageBucket: "learntochecktime.appspot.com",
    messagingSenderId: "696422476059"
  };

  firebase.initializeApp(config);

  let database = firebase.database();

  const itemToLS = (name, item) => { localStorage.setItem(name, JSON.stringify(item)); }; //save string value to ls

  const itemFromLS = (name) => { return JSON.parse(localStorage.getItem(name)); }; //get string value from ls

  const calculateTime = (drink, weight, gValue) => { //time to get bac to 0 by specified drink
    return Math.floor((((drink * 5.14) / (weight * gValue)) / 0.015) * 60); //* 60 to get real numbers or specify minutes
  };

  const calculatetBACOneDrink = (drink, weight, gValue) => {
    return ((drink * 5.14) / (weight * gValue)); //now time it is bac at the moment of taking one drink
  };

  const calculateBACTime = (bac, time) => {
    return bac - (0.015 * (time / 60)); //total bac - time
  }

  const updateStatusBAC = (name) => { //update status in firebase
    database.ref().child(name).update({
      status: userInfo.status,
      bac: userInfo.currentBAC
    });
  };

  const timeOutMessage = (id, message1, message2) => { //show message for 3 sec after clear the field
    $(id).text(message1);
    if (message2 == null) message2 = '';
    setTimeout(function () {
      $(id).text(message2);
    }, 3000);
  };

  const validateInput = (name, weight) => {//validate user name and weigth, if correct return values, if not show message
    let message = '';
    name = $('#userName').val().trim();
    weight = parseInt($('#weight').val().trim());
    if(isNaN(weight) === false && name !== ''){
      itemToLS(namesLS.userName, name);
      $('.form').hide();
      $('#drinksField').show();
      $('#text').text(`Hi ${name}!`);
      return [name, weight];
    } else {
      if(isNaN(weight) && name === '') message = 'Weight is not a number. Name is an empty string!';
      else if (isNaN(weight)) message = 'Weight is not a number!';
      else if( name === '') message = 'Name is an empty string!';
      timeOutMessage('#firstMessage', message);
      return false;
    }
  };

  const setDrinktoZero = () => { //set session drinks to zero and send it to ls
    sessionDrinks = {beer: {number: 0}, wine: {number: 0}, shot: {number: 0}, cocktail: {number: 0}, messageSend: false};
    itemToLS(namesLS.sessionDrinks, sessionDrinks);
  };

  const getDrinks = () => {
    for(let i in sessionDrinks) {//if any drink has been drunk
      if(itemFromLS(namesLS.sessionDrinks)[i].number > 0) $(`#${i}Row`).html(`<td>${i}</td><td>${itemFromLS(namesLS.sessionDrinks)[i].number}</td><td>${itemFromLS(namesLS.sessionDrinks)[i].time}</td>`);
      else $(`#${i}Row`).text('');
    };
  };

  const sendMessage = (number, message) => {//send message
    $.post('https://vem-web.com/sms/index.php', {'act':'send_message', 'to': number, 'message': message}, function(data){
      if(data !== "error"){
        timeOutMessage('#textPhoneNumber', 'Notification message has been sent!');
      }else{
        console.log(data);
      }
    });
  };


  const soberLevelInterval = () => {
    let soberTime, timeDifference, bacLevel, r, g, b;

    if( userInfo.status > 0) { //fire if status more than 0, set interval, run it untill difference is 0, clear interval, remove start time from firebase
      timer = setInterval(function(){
        timeDifference = moment().diff(moment(userInfo.startDrink), "seconds");//change to minutes to get real numbers
        soberTime = userInfo.status - timeDifference;
        bacLevel = calculateBACTime(userInfo.currentBAC, timeDifference); //total bac - total time that passed
        $('#bacLevel').text(bacLevel.toFixed(5));

        if (bacLevel < 0.1) {
          r = 60, b = 5;
          g = Math.floor((55 * bacLevel * 10) + 200); //increasing green, do not go below 200
        }  else if (bacLevel > 0.1 && bacLevel < 0.2) {
          r = 245, b = 10;
          g = Math.floor(255 / (bacLevel * 10)); // decreasing green
        } else if (bacLevel > 0.2) {
          r = 244, b = 0, g = 5; //static
        }

        $('#bac').css(`background-color`, `linear-gradient( to right, rgba(${r}, ${g}, ${b}, 0.8), rgba(${r+50}, ${g+50}, ${b+50}, 0.8))`);

        if (bacLevel > 0.22 && sessionDrinks.messageSend !== true) {
          let messageTvilio = `The bac level of ${userInfo.name} is ${bacLevel.toFixed(3)}. You might need to contact the user by phone number ${userInfo.userPhoneNumber}!`;
          // sendMessage('+19177326497', messageTvilio);
          sessionDrinks.messageSend = true; //messages would not be sent in each interval, but just once
        } else if (bacLevel < 0.22) sessionDrinks.messageSend = false;
        itemToLS(namesLS.sessionDrinks, sessionDrinks);

        if(soberTime <= 0){
          userInfo.status = 0;
          userInfo.currentBAC = 0;
          updateStatusBAC(userInfo.name);
          clearInterval(timer);
          setDrinktoZero();
          getDrinks();
          database.ref().child(userInfo.name).child('/start').remove();
          $('#bacLevel').text(userInfo.status);
          timeOutMessage('#text', 'You\'re sober', `Hi ${userInfo.name}!`);
        } else {
          $('#text').text(`It will take about ${soberTime} to sober up.`);
        }
      }, 1000);
    }
  };

  //program execution
  if(itemFromLS(namesLS.sessionDrinks) === null) setDrinktoZero(); //check if there is drinks for current session
  else sessionDrinks = itemFromLS(namesLS.sessionDrinks);

  if(itemFromLS(namesLS.userName) != null){ //display in the beggining
    $('.form').hide();
    $('#drinksField').show();
    userInfo.name = itemFromLS(namesLS.userName);
    $('#text').text(`Hi ${userInfo.name}!`);
    getDrinks();
  } else {
    $('.form').show();
    $('#drinksField').hide();
  }

  $('#submit').on('click', function(){
    userInfo.name = validateInput(userInfo.name, userInfo.weight)[0];
    userInfo.weight = validateInput(userInfo.name, userInfo.weight)[1];
    userInfo.userPhoneNumber = $('#userPN').val().trim();
    userInfo.helpPhoneNumber = $('#helpPN').val().trim();
    userInfo.gValue = staticValues.gender[$('#gender').val().toLowerCase()];
    $('input').val('');
  });

  $('#deleteLS').on('click', function(){
    localStorage.removeItem(namesLS.userName); //delete local storage and firebase set values to 0
    localStorage.removeItem(namesLS.sessionDrinks);
    clearInterval(timer);
    userInfo.status = 0;
    userInfo.currentBAC = 0;
    database.ref(userInfo.name).remove();
    $('.form').show();
    $('#drinksField').hide();
  });

  $('#beer, #wine, #shot, #cocktail').on('click', function(event){
    let time, bac;
    sessionDrinks[$(event.target).attr('id')].time = moment().format('hh:mm a MMM Do');
    sessionDrinks[$(event.target).attr('id')].number += 1;
    itemToLS(namesLS.sessionDrinks, sessionDrinks);
    getDrinks();

    $('#text').text(`Drink added.`);
    clicked = true;
    clearInterval(timer); //clear interval we previously had
    if (userInfo.status === 0) { //if user did not drink set new drink start time
      userInfo.startDrink = moment().valueOf(); //unix
      database.ref().child(userInfo.name).update({
        start: userInfo.startDrink,
        status: userInfo.status,
        bac: userInfo.currentBAC,
        weight: userInfo.weight,
        gValue: userInfo.gValue,
        userPhoneNumber: userInfo.userPhoneNumber,
        helpPhoneNumber: userInfo.helpPhoneNumber
      });
    };

    time = calculateTime(staticValues.drinks[$(event.target).attr('id')], userInfo.weight ,userInfo.gValue); //how much time it need for one drink
    bac = calculatetBACOneDrink(staticValues.drinks[$(event.target).attr('id')], userInfo.weight ,userInfo.gValue);
    userInfo.status += time;
    userInfo.currentBAC += bac;
    updateStatusBAC(userInfo.name);
    soberLevelInterval();
  });

  if(itemFromLS(namesLS.userName) !== null) {
    database.ref().child(userInfo.name).on('value', function(snap){
      if(snap.val() != null) {
        userInfo.startDrink = snap.val().start;
        userInfo.status = snap.val().status;
        userInfo.currentBAC = snap.val().bac;
        userInfo.weight = snap.val().weight;
        userInfo.gValue = snap.val().gValue;
        userInfo.userPhoneNumber = snap.val().userPhoneNumber;
        userInfo.helpPhoneNumber = snap.val().helpPhoneNumber;
      }
      if(clicked === false) soberLevelInterval(); //check status in the begging of the program, do not check when value changed(button ckicked)
    });
  }

});
