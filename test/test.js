module.exports = () => {
	console.log(this.val);
}

Object.assign(module.exports, {
	set: (v) => this.val = v,
	get: () => this.val
});
