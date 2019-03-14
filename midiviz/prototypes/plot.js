var source = document.getElementById('input');
var midiFile = MIDIParser.parse(source, function(obj) {
  console.log(obj);
});
