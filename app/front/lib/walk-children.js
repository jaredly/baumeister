
import React from 'react'

export default function walkChildren(children, newProps, crawlIn) {
  return React.Children.map(children, child => {
    if (!child || typeof child === 'string') return child
    const children = crawlIn(child) ? walkChildren(child.props.children, newProps, crawlIn) : child.props.children
    return React.cloneElement(child, newProps(child.props, child.type), children)
  })
}

