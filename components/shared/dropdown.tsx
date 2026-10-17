"use client";
import * as React from 'react';
import {Select} from 'radix-ui';
import {Check,ChevronDown} from 'lucide-react';
type Props=Omit<React.SelectHTMLAttributes<HTMLSelectElement>,'onChange'> & {onChange?:(event:{target:{value:string};currentTarget:{value:string}})=>void};
export function Dropdown({children,value,defaultValue,name,required,disabled,onChange,className,id,'aria-label':ariaLabel,...rest}:Props){
 const options:React.ReactElement<React.OptionHTMLAttributes<HTMLOptionElement>>[]=[];
 function collect(nodes:React.ReactNode){React.Children.forEach(nodes,node=>{if(!React.isValidElement(node))return;if(node.type==='option')options.push(node as typeof options[number]);else if(node.type===React.Fragment)collect((node.props as {children:React.ReactNode}).children);});}collect(children);
 const placeholder=options.find(o=>String(o.props.value??'')==='')?.props.children;
 return <Select.Root dir="rtl" name={name} required={required} disabled={disabled} value={value===undefined?undefined:String(value)} defaultValue={defaultValue===undefined?undefined:String(defaultValue)} onValueChange={next=>onChange?.({target:{value:next},currentTarget:{value:next}})}>
 <Select.Trigger id={id} aria-label={ariaLabel} aria-describedby={rest['aria-describedby']} aria-invalid={rest['aria-invalid']} className={'dropdown-trigger '+(className||'')}><Select.Value placeholder={placeholder||'اختاري من القائمة'}/><Select.Icon><ChevronDown size={17}/></Select.Icon></Select.Trigger>
 <Select.Portal><Select.Content position="popper" sideOffset={5} collisionPadding={12} className="dropdown-menu"><Select.Viewport>{options.filter(o=>String(o.props.value??'')!=='').map(o=><Select.Item className="dropdown-item" value={String(o.props.value)} disabled={o.props.disabled} key={String(o.props.value)}><Select.ItemText>{o.props.children}</Select.ItemText><Select.ItemIndicator><Check size={16}/></Select.ItemIndicator></Select.Item>)}</Select.Viewport></Select.Content></Select.Portal>
 </Select.Root>;
}
