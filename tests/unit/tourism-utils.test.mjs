import {test} from 'node:test';
import assert from 'node:assert/strict';
import {contactLinks,filterServices,validCoordinates} from '../../src/utils/tourism-utils.js';
const service={name:'Rumah & Pesisir',capacity:6,price:150000,phone:'081234567890',data_status:'terverifikasi',availability:'inquiry',rate_unit:'per kelompok'};
const textOf=url=>decodeURIComponent(new URL(url).searchParams.get('text'));
test('contactLinks withholds WhatsApp for demo data and invalid or empty numbers',()=>{
 assert.equal(contactLinks('stay',{...service,data_status:'demo'}),null);
 for(const phone of ['','123','0212345678'])assert.equal(contactLinks('stay',{...service,phone}),null);
});
test('contactLinks normalizes the number and builds ask/book messages with name and identity',()=>{
 const links=contactLinks('stay',service);
 assert.ok(links.ask.startsWith('https://wa.me/6281234567890?text='));
 assert.ok(links.book.startsWith('https://wa.me/6281234567890?text='));
 const ask=textOf(links.ask),book=textOf(links.book);
 assert.match(ask,/Rumah & Pesisir/);assert.match(ask,/Desa Marga Mulya/);
 assert.match(book,/Rumah & Pesisir/);assert.match(book,/Desa Marga Mulya/);assert.match(book,/booking/i);
 const custom=contactLinks('stay',service,'Desa Contoh');assert.match(textOf(custom.ask),/Desa Contoh/);
});
test('contactLinks drops the booking link when a service is paused but keeps the ask link',()=>{
 const links=contactLinks('stay',{...service,availability:'paused'});
 assert.equal(links.book,null);assert.ok(links.ask);
});
test('contactLinks uses the guide wording for pemandu services',()=>{
 const links=contactLinks('guide',{...service,name:'Pemandu Pesisir'});
 assert.match(textOf(links.ask),/layanan pemandu Pemandu Pesisir/);
 assert.match(textOf(links.book),/memesan pemandu Pemandu Pesisir/);
});
test('Service filters combine capacity, tariff, type and search without treating missing price as free',()=>{
 const items=[{...service,id:1,stay_type:'Rumah sewa',area:'Pesisir',price:null},{...service,id:2,stay_type:'Kamar tamu',area:'Desa',price:100000,capacity:2},{...service,id:3,stay_type:'Rumah sewa',area:'Pesisir',price:250000}];
 assert.deepEqual(filterServices(items,{guests:'4',budget:'300000',query:'pesisir',type:'Rumah sewa'}).map(x=>x.id),[3]);
 assert.deepEqual(filterServices(items,{sort:'price'}).map(x=>x.id),[2,3,1]);assert.equal(items[0].id,1);
});
test('Map coordinates reject missing values, strings, infinity and out of range points',()=>{
 assert.ok(validCoordinates(-6.03,106.52));assert.ok(validCoordinates(0,0));
 for(const coords of [[null,null],['-6.03',106.52],[91,0],[0,181],[NaN,0],[Infinity,2],[undefined,2]])assert.equal(validCoordinates(...coords),false);
});
