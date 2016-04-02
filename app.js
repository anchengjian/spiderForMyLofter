;(function(undefined){
  'use strict';

  var request = require('request'),
      spide = require('rssspider'),
      fs = require('fs'),
      url = require('url'),
      events = require('events'),
      writeImgEvent = new events.EventEmitter(),
      writeMDEvent = new events.EventEmitter(),
      host='anchengjian.lofter.com',
      rssUrl='http://anchengjian.lofter.com/rss',
      requestOptions={
        url:'',
        headers:{
          'Accept':'*/*',
          'Accept-Encoding':'gzip, deflate, sdch',
          'Accept-Language':'zh-CN,zh;q=0.8,en;q=0.6,zh-TW;q=0.4',
          'Cache-Control':'no-cache',
          'Connection':'keep-alive',
          'Host':host,
          'Pragma':'no-cache',
          'Upgrade-Insecure-Requests':1,
          'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.87 Safari/537.36'
        }
      },
      imgsPath='./imgs',
      articlesPath='./articles',
      toMarkdown = require('./libs/toMarkdown.js');

  spide
    .fetchRss(rssUrl)
    .then(function(data){

      fs.mkdir(imgsPath, function(err){
        if(err) throw err;
        console.log('mkdir '+imgsPath+' ok~~');
      });

      fs.mkdir(articlesPath, function(err){
        if(err) throw err;
        console.log('mkdir '+articlesPath+' ok~~');
      });

      // 找出图片
      var allImgs=[];
      data.map(function(ele,i){

        ele.description=ele.description.replace(/http\:\/\/([\S]*)(\/[\d]*)\.(jpg|png|gif|jpeg|webp)/g,function($1,$2,$3,$4){
          var res=url.parse($1);
          res.name=$3+'.'+$4;
          allImgs.push(res);
          return imgsPath+res.name;
        });

        ele.summary=null;

        return ele;
      });

      // 保存源文件
      fs.writeFile(articlesPath+'/blog.json', JSON.stringify(data), function(err){
        if (err) throw err;
        console.log(articlesPath+'/blog.json  saved!!');
      });

      // 储存为md格式
      var articlesLen=data.length;
      writeMDEvent.on('articleSaved', function(){
        var article=data[--articlesLen];
        writeMD( article, function(){
          if(articlesLen<=0) return;
          writeMDEvent.emit('articleSaved');
        });
      });
      // 初始化触发
      writeMDEvent.emit('articleSaved');

      var len=allImgs.length;
      // 监听完成事件
      writeImgEvent.on('done', function(){
        var img=allImgs[--len];
        writeImgFile( img, function(){
          if(len<=0) return;
          writeImgEvent.emit('done');
        });
      });

      // 初始化触发
      writeImgEvent.emit('done');

      return data;
    });

  function writeImgFile( img, callback ) {
    if(!img){
      if(!!callback && isFn(callback)) callback();
      return ;
    }

    requestOptions.url=img.href;
    requestOptions.headers.Host=img.host;
    request(requestOptions).pipe(fs.createWriteStream(imgsPath+img.name));

    console.log(img.name+'  saved!!');
    if(!!callback && isFn(callback)) callback();
  }

  function writeMD( article, callback ) {
    if(!article){
      if(!!callback && isFn(callback)) callback();
      return ;
    }

    var name=articlesPath+'/'+article.title+'.md',
        data=toMarkdown.toMarkdown(article.description),
        atime=article.date,
        mtime=article.date;

    fs.writeFile(name, data,  function(err) {
      if (err) return console.error(err);
      console.log(name+" 数据写入成功！");

      fs.utimes(name, atime, mtime, function(err){
       if(err) throw err;
       console.log(name+' 时间修改成功！');
      });
    });

    

    console.log(article.title+'  saved!!');
    if(!!callback && isFn(callback)) callback();
  }

  function isFn(fn){
    return toString.call(fn) === '[object Function]';
  }


})();