// Keep unranked/new products in their existing catalog order, after saved products.
export function orderCategoryProducts<T extends {id:string}>(products:T[],order?:string[]):T[]{
 if(!Array.isArray(order)||!order.length)return products;
 const ranks=new Map<string,number>();
 for(const id of order)if(typeof id==='string'&&!ranks.has(id))ranks.set(id,ranks.size);
 return products.map((product,index)=>({product,index,rank:ranks.get(product.id)??ranks.size}))
  .sort((a,b)=>a.rank-b.rank||a.index-b.index).map(item=>item.product);
}
