var isoList = ['50' , '100', '200','400','800','1600','3200'];
// const res= [
//   {"lightDetail": "Светодиодные лампы", "aperture": 2,  "exposure": "1/500"},
//   {"lightDetail": "Светодиодные лампы", "aperture": 2.8,"exposure": "1/250"},
//   {"lightDetail": "Светодиодные лампы", "aperture": 4,  "exposure": "1/125"},
// ];
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

  //если элемент всего 1
  //то выбираем его
  if (listValues.length == 1){
    el.querySelectorAll('input').forEach(element => {
      if (listValues.indexOf(element.value)==0){
        element.checked = true;
        filters_stage[item]=element.value;
        itemMakeVisibleNext(item);
        radiosGetItemsFromSql(currentItem['next']);
      }
    });
    }
}


//функция генерирует текст запроса для alaSQL
function sqlQueryCreateForFilters (item) {
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

function sqlQueryCreateForFiltersResult () {
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
  where += 1;//'aperture != "-"';
  let orderBy=" order by aperture"; //в конце остается AND , чтобы долго не мучаться, просто после него пишем 1 — всегда верно
  let query = "SELECT lightDetail, aperture, exposure FROM tab('"+tabFile+"')" + where + orderBy;
  // console.log(query);
  return query;
}


//функция собирает значения для фильтров
//использует alasql, читает tsv
function filtersGetItemsFromSql (itemName) 
{
  let query = sqlQueryCreateForFilters(itemName);
  // console.log(query);
  alasql.promise([
      [query]
  ]).then(function(results){
    let arrayOfItems = results[0].flat();
    filterCallBackToFillFromSql_(itemName,arrayOfItems);
  })
  .catch(
    // console.error
    );
}


//функция собирает значения для радиобатонов
//использует alasql, читает tsv
function radiosGetItemsFromSql (itemName) 
{ if(!itemName){
    return 'empty itemName';
  }
  let query = sqlQueryCreateForFilters(itemName);
  // console.log(query);
  alasql.promise([
      [query]
  ]).then(function(results){
    let arrayOfItems = results[0].flat();
    //результат передаем в функцию ↓
    radiosOptionsActiveList(itemName,arrayOfItems);
  })
  .catch(
    // console.error
    );
}


//сделать следующий блок видимым
function itemMakeVisibleNext (currentItem){
  let next = mainDict[currentItem]["next"];
  if (next){
    document.getElementById(mainDict[next]["blockId"]).classList.remove('invisible');
    document.getElementById(mainDict[next]["blockId"]).hidden=false;
  }
  //если это последний блок (сейчас это light), то включаем кнопку
  if (currentItem=='LIGHT'){
    resultButtonActivate();
  }
}


//сделать текущий блок видимым
function itemMakeVisibleCurrent (currentItem){
  document.getElementById(mainDict[currentItem]['blockId']).classList.remove('invisible');
}


//убирает стиль инвизибл и hidden из элементID
function invisibleRemove(id){
  document.getElementById(id).classList.remove('invisible');
  document.getElementById(id).hidden=false;
}


//напрлняет фильтр значениями
function filterFillOptions(item){
  filtersGetItemsFromSql(item);
  itemMakeVisibleCurrent(item);
}


//сделать всё видимым сразу (для отладки)
function AllItemsMakeVisible (){
  for (let item in mainDict){
    itemMakeVisibleCurrent(item);
  }
  // console.log('AllItemsMakeVisible');
}


//функция нужна, чтобы в нее можно было передать получившийся отфильтрованный массив элементов
//т.к. alaSQL не умеет синхронно читать из tsv, а умеет только асинхронно и callback
function filterCallBackToFillFromSql_(item,options){
  let currentItem = mainDict[item];
  let selected = filters_stage[item] ? filters_stage[item] : currentItem['selectedDefault'];
  filterOptionsFill(options,currentItem['selectId'],selected);
  // console.log('test2');
  itemMakeVisibleCurrent(item);
}


//В самом начале заполняем ISO фильтр
//filterOptionsFill(isoList,'ISOSelector','ISO плёнки')
filtersGetItemsFromSql('ISO');


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
      filtersGetItemsFromSql(currentItem['next']);
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
    filtersGetItemsFromSql(item);
    
    //заполнили, без хедера, выбранным оставили то, что выбрал человек

    // if (selectedValue) {
    //   filtersGetItemsFromSql(currentItem['next']);
    // };

    itemMakeVisibleNext(item);
    radiosGetItemsFromSql(currentItem['next']);
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
    radiosGetItemsFromSql(currentItem['next']);
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
    resultButtonActivate();
    }
);


//активация кнопки
function resultButtonActivate(){
  document.getElementById('btResult').classList.remove('disabled');
}


//лисенер на итоговой кнопке
btResult.addEventListener("click",
    function(){
      dataLayer.push(filters_stage);
      //открываем попап с результатами
      document.getElementById("result-block").classList.remove("_closed");
      //получаем результаты. там внутри промиса вызовется функция наполнения
      sqlGetResult(sqlQueryCreateForFiltersResult());
    }
);

//лисенер на стартовой кнопке
btStart.addEventListener("click",
    function(){
      
      document.getElementById("intro").remove();
      document.getElementById("btStart").remove();
      document.getElementById("filters").hidden=false;
      document.getElementById("btResult").hidden=false;
    }
);


//лисенер на крестике в попапе с результатами
document.querySelector(".result-popup__close").addEventListener("click",
  function(){
    document.getElementById("result-block").classList.add("_closed");
    }
);


//функция заполнения попапа результатами
function resultFillValues(results){
  //на вход массив словарей
  //[{"lightDetail":"qweqwe","exposure":"1/1000","aperture":"2.3"}]

  // console.log(results);
  let len = results.length;
  //если получили 0 результатов, то собираем массив из 1 резльтата,
  //в котором говорим, что результатов нет
  if (len == 0) {
    results = [{
      "lightDetail": filters_stage["PLACE"] + ", для ISO = " + filters_stage["ISO"] + ", при освещении «" + filters_stage["LIGHT"] + "»\nне нашли подходящей экспо пары",
      "aperture": "-",
      "exposure": "-"
    }];
  }

  for (let pair in results){
    // console.log(results[pair]['aperture'])
    if(results[pair]['aperture']==0){results[pair]['aperture']='-'};
  }

  //берем первую пару
  //для заполнения первой карточки
  let firstPair = results.pop();
  firstResult = document.getElementById('res_1');
  firstResult.querySelector('#res_1_exposure').innerText = firstPair['exposure'];
  firstResult.querySelector('#res_1_aperture').innerText = firstPair['aperture'];
  firstResult.querySelector('#res_1_lightDetail').innerText = firstPair['lightDetail'];

  //если результатов больше чем 1, то показываем блок
  if (len >1){
    document.getElementById('res_2andMore').hidden=false;
  }else {document.getElementById('res_2andMore').hidden=true;}

  let i=2;
  while (results.length && i <8){
    
    // console.log(i);
    let pair = results.pop();
    let result=document.getElementById('res_'+i);
    result.hidden=false;
    for (let item in pair){
      // console.log('#res_'+i+'_'+item);
      result.querySelector('#res_'+i+'_'+item).innerText=pair[item];
    }
    i++ ;
  }
  while (i<8){
    let result=document.getElementById('res_'+i);
    result.hidden=true;
    i++;
  }
}


//функция получения словаря с результатами
//результат передается в resultFillValues()
function sqlGetResult (query) 
{ 
  // console.log(query);
  alasql.promise([
      [query]
  ]).then(function(results){
    let arrayOfItems = results[0];
    // console.log(arrayOfItems);
    resultFillValues(arrayOfItems);
  })
  .catch(
    // console.error
    );
}


//при ресайзе дергаем функцию resizeResultPopup
window.addEventListener("resize",resizeResultPopup);


//меняем размер выпадайки с результатом в зависимости от высоты окна
function resizeResultPopup(){
  let heightNew=window.innerHeight;
  // console.log(heightNew);
  let popup = document.getElementById('result-popup__modal');
  
  //в зависимости от высоты окна, меняем размер выпадайки с результатами
  if(heightNew < 812){
    popup.classList.remove('result-popup__modal');
    popup.classList.add('result-popup__modal__small_height');
  } else{
    popup.classList.add('result-popup__modal');
    popup.classList.remove('result-popup__modal__small_height');
  }
}



resizeResultPopup()