var isoList = ['50' , '100', '200','400','800','1600','3200'];
var tabFile = './assets/expos.tsv';  

var filters_stage = {
  "ISO": '',
  "GENRE": '',
  "PLACE":'',
  "LIGHT":''
};

var mainDict = {
  "ISO": {'next':'GENRE',
          'blockId':'ISOBlock',
          'headerId':'headerISOSelect', 
          'selectId':'ISOSelector',
          'selectedDefault':'ISO плёнки',
          },
  "GENRE": {'next':'PLACE',
            'blockId':'GENREBlock',
            'headerId':'headerGENRESelect',
            'selectId':'GENRESelector',
            'selectedDefault':'Что фотографируешь?',
            'filters':['ISO']
            },
  "PLACE":{'next':'LIGHT',
            'blockId':'PLACEBlock',
            'headerId':'headerPLACESelect',
            'selectId':'PLACESelector',
            'selectedDefault':'',
            'filters':['ISO','GENRE']
            },
  "LIGHT":{'next':'',
            'blockId':'LIGHTBlock',
            'headerId':'headerLIGHTSelect',
            'selectId':'LIGHTSelector',
            'selectedDefault':'',
            'filters':['ISO','GENRE','PLACE']
            }
};



//функция, которая генерирует список options для select'a
function filterOptionsCreate(listOptsIn,selectedValue) {
  let fragment = new DocumentFragment();
  let listOpts= Object.assign([],listOptsIn);
  //проверяем передали ли выбранное значение
  //и если его нет
  if (selectedValue && listOpts.indexOf(selectedValue)==-1) {
    listOpts.unshift(selectedValue);  //добавляем в начало
  } 

  listOpts.forEach(option =>  {
    let opt = document.createElement('option');

    //если selectedValue равен элементу, то ставим атрибут selected
    opt.selected = (option==selectedValue);         
    
    opt.value = option;
    opt.innerHTML = option;
    fragment.append(opt);
  });
  return fragment;
}

  //удаляем все options внутри фильтра (на входе id)
function filterOptionsClear(elementId) {
    let filterOptions = document.getElementById(elementId);
    while (filterOptions.options.length) {
      filterOptions.remove(0);
    }
}

  //заполняем фильтр элементами
function filterOptionsFill(listItems,elementId,selectedValue){
    //сначала удаляем всё,
    filterOptionsClear(elementId);
    //потом пишем новое
    document.getElementById(elementId).append(filterOptionsCreate(listItems,selectedValue));
}


function radioOptionsActiveAll(item){
  let currentItem = mainDict[item];

  let el = document.getElementById(currentItem['selectId']);
  el.querySelectorAll('input').forEach(element => {
    if (element.disabled){
      element.disabled=false;
    }
  });
}

//функция, которая оставляет активными только те values которые есть в listValues
function radiosOptionsActiveList(item,listValues){
  let currentItem = mainDict[item];

  let el = document.getElementById(currentItem['selectId']);
  // берем все инпуты внутри выбранного элемента
  // у каждого берем value, если оно есть в listValues, то отсавляем активным
  // если нет, то делаем неактивным
  el.querySelectorAll('input').forEach(element => {
    if (listValues.indexOf(element.value)==-1 ){
      element.disabled=true;
      //если проверяемое значение не попало listValues
      //при этом оно равно текущему фильтру сущности
      //то фильтр сбрасываем и элемент развыделяем
      if (element.value == filters_stage[item]){
        filters_stage[item] = '';
        element.checked = false;
      }
    } else{
      element.disabled=false;

    }
  });
}




//функция генерирует текст запроса для alaSQL
function sqlQueryCreate (item) {
  
  //для каждой сущности, нужно учитывать разные фильтры
  //например когда выбираем GENRE (что фотографируешь),
  //то нужно показывать только те, которые есть для выбранного ISO
  //что считать в фильтр, а что нет задаем в mainDict
  //ниже генерируем кляузу where для всех фильтров
  let where ='';
  if (mainDict[item]["filters"]){
    where = ' WHERE ';
    for (let filter of mainDict[item]["filters"]){
      if(filters_stage[filter]){
      if (filter=='ISO'){
        //если фильтруем по ISO, то внутри цифры, и вокруг filters_stage[filter]  ' не ставим
      where = where + filter + " = " + filters_stage[filter] + " AND ";
      }else{
      where = where + filter + " = '" + filters_stage[filter] + "' AND ";
    }
    }}
  where +=1; //в конце остается AND , чтобы долго не мучаться, просто после него пишем 1 — всегда верно
  }

  query = "SELECT MATRIX DISTINCT(" + item + ") FROM tab('"+tabFile+"')" + where;
  return query;
}

function sqlQueryCreateResult () {
  
  //для каждой сущности, нужно учитывать разные фильтры
  //например когда выбираем GENRE (что фотографируешь),
  //то нужно показывать только те, которые есть для выбранного ISO
  //что считать в фильтр, а что нет задаем в mainDict
  //ниже генерируем кляузу where для всех фильтров
  let where = ' WHERE ';
    for (let filter in filters_stage){
      if(filters_stage[filter]){
        if (filter=='ISO'){
        //если фильтруем по ISO, то внутри цифры, и вокруг filters_stage[filter]  ' не ставим
        where = where + filter + " = " + filters_stage[filter] + " AND ";
        }else{
        where = where + filter + " = '" + filters_stage[filter] + "' AND ";
      }
    }}
  where +=1; //в конце остается AND , чтобы долго не мучаться, просто после него пишем 1 — всегда верно

  let query = "SELECT lightDetail, aperture, exposure FROM tab('"+tabFile+"')" + where;
  console.log(query);
  return query;
}



function getItemsForFilter (itemName) 
{
  let query = sqlQueryCreate(itemName);
  console.log(query);
  alasql.promise([
      [query]
  ]).then(function(results){
    let arrayOfItems = results[0].flat();
    filterCallBackToFillFromSql_(itemName,arrayOfItems);
  })
  .catch(console.error);
}

function getItemsForRadios (itemName) 
{
  let query = sqlQueryCreate(itemName);
  console.log(query);
  alasql.promise([
      [query]
  ]).then(function(results){
    let arrayOfItems = results[0].flat();
    radiosOptionsActiveList(itemName,arrayOfItems);
  })
  .catch(console.error);
}

function getItemsForResult (itemName) 
{
  let query = '';
  alasql.promise([
      [query]
  ]).then(function(results){
    let arrayOfItems = results[0].flat();
    radiosOptionsActiveList(itemName,arrayOfItems);
  })
  .catch(console.error);
}

//сделать следующий блок видимым
function itemMakeVisibleNext (currentItem){
  let next = mainDict[currentItem]["next"];
  document.getElementById(mainDict[next]["blockId"]).classList.remove('invisible');
}

//сделать текущий блок видимым
function itemMakeVisibleCurrent (currentItem){
  document.getElementById(mainDict[currentItem]['blockId']).classList.remove('invisible');
}

function invisibleRemove(id){
  document.getElementById(id).classList.remove('invisible');
}

function fillFilterFiltered(item="ISO"){
  getItemsForFilter(item);
  itemMakeVisibleCurrent(item);
}

function AllItemsMakeVisible (){
  for (let item in mainDict){
    itemMakeVisibleCurrent(item);
  }
  console.log('AllItemsMakeVisible');
}


//функция нужна, чтобы в нее можно было передать получившийся отфильтрованный массив элементов
//т.к. alaSQL не умеет синхронно читать из tsv, а умеет только асинхронно и callback
function filterCallBackToFillFromSql_(item,options){
  let currentItem = mainDict[item];
  let selected = filters_stage[item] ? filters_stage[item] : currentItem['selectedDefault'];
  filterOptionsFill(options,currentItem['selectId'],selected);
  console.log('test2');
  itemMakeVisibleCurrent(item);
}



//В самом начале заполняем ISO фильтр
//filterOptionsFill(isoList,'ISOSelector','ISO плёнки')
getItemsForFilter ('ISO');


//слушаем изменения в ISO
ISOSelector.addEventListener("change",
  function () {
    let item = 'ISO';
    let currentItem = mainDict[item];

    //начинаем показывать маленький серенький хедер у фильтра
    invisibleRemove(currentItem['headerId']);

    let selectedValue = ISOSelector.value; //значение ISO которое выбрали
    filters_stage[item] = selectedValue;
    let selectId = currentItem['selectId']; //id селекта


    //перезаполняем, чтобы убрать ISO плёнки из выпадайки, так как теперь показываем header
    filterOptionsClear(selectId); //очистили фильтр
    filterOptionsFill(isoList, selectId, selectedValue); //заполнили, без хедера, выбранным оставили то, что выбрал человек

    if (selectedValue) {
      getItemsForFilter(currentItem['next']);
    }

    //itemMakeVisibleNext(item);
  }
);


GENRESelector.addEventListener("change",
  function () {
    let item = 'GENRE';
    let currentItem = mainDict[item];

    //начинаем показывать маленький серенький хедер у фильтра
    invisibleRemove(currentItem['headerId']);

    let selectedValue = GENRESelector.value;  //значение которое выбрали
    filters_stage[item] = selectedValue;      //записали состояние фильтра
    let selectId = currentItem['selectId'];       //id селекта

    //перезаполняем себя, чтобы убрать «Что фотографируешь?» из выпадайки, так как теперь показываем header
    getItemsForFilter(item);
    
    //заполнили, без хедера, выбранным оставили то, что выбрал человек

    // if (selectedValue) {
    //   getItemsForFilter(currentItem['next']);
    // };

    itemMakeVisibleNext(item);
    getItemsForRadios(currentItem['next']);
  }
);


PLACESelector.addEventListener("change",
  function () {
    let item = 'PLACE';
    let currentItem = mainDict[item];

    let el = document.getElementById(currentItem['selectId']);
    el.querySelectorAll('input').forEach(element => {
        if (element.checked){
          filters_stage[item]=element.value;
          }
      }
    );
    itemMakeVisibleNext(item);
    getItemsForRadios(currentItem['next']);
  }
);


LIGHTSelector.addEventListener("change",
  function () {
    let item = 'LIGHT';
    let currentItem = mainDict[item];

    let el = document.getElementById(currentItem['selectId']);
    el.querySelectorAll('input').forEach(element => {
        if (element.checked){
          filters_stage[item]=element.value;
          }
      }
    );
    document.getElementById('btResult').classList.remove('disabled');
    }
);

btResult.addEventListener("click",
    function(){
      document.getElementById("result-block").classList.remove("_closed");
    }
);

document.querySelector(".result-popup__close").addEventListener("click",
  function(){
    document.getElementById("result-block").classList.add("_closed");
    }
);
