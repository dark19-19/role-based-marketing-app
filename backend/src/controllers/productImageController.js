const productImageService = require('../services/productImageService');

class ProductImageController {

addImage = async(req,res)=>{

try{

const productId = req.params.id;
const { image_url } = req.body;

const result = await productImageService.addImage(productId,image_url);

res.status(201).json({
success:true,
data:result
});

}catch(err){

res.status(400).json({
success:false,
error:err.message
});

}

};

listImages = async(req,res)=>{

try{

const productId = req.params.id;

const result = await productImageService.listImages(productId);

res.json({
success:true,
data:result
});

}catch(err){

res.status(400).json({
success:false,
error:err.message
});

}

};

deleteImage = async(req,res)=>{

try{

const imageId = req.params.id;

const result = await productImageService.deleteImage(imageId);

res.json({
success:true,
data:result
});

}catch(err){

res.status(400).json({
success:false,
error:err.message
});

}

};

updateOrder = async(req,res)=>{

try{

const imageId = req.params.id;
const { sort_order } = req.body;

const result = await productImageService.updateOrder(imageId,sort_order);

res.json({
success:true,
data:result
});

}catch(err){

res.status(400).json({
success:false,
error:err.message
});

}

};

}

module.exports = new ProductImageController();