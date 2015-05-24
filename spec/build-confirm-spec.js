var _ = require('lodash');
var fs = require('fs-plus');
var temp = require('temp');

describe('Build', function() {
  'use strict';

  var goodMakefile = __dirname + '/fixture/Makefile.good';

  var directory = null;
  var workspaceElement = null;

  temp.track();

  beforeEach(function() {
    directory = fs.realpathSync(temp.mkdirSync({ prefix: 'atom-build-spec-' })) + '/';
    atom.project.setPaths([ directory ]);

    atom.config.set('build.buildOnSave', false);
    atom.config.set('build.panelVisibility', 'Toggle');
    atom.config.set('build.saveOnBuild', false);

    jasmine.unspy(window, 'setTimeout');
    jasmine.unspy(window, 'clearTimeout');

    runs(function() {
      workspaceElement = atom.views.getView(atom.workspace);
      jasmine.attachToDOM(workspaceElement);
    });

    waitsForPromise(function() {
      return atom.packages.activatePackage('build');
    });
  });

  afterEach(function() {
    fs.removeSync(directory);
  });

  describe('when the text editor is modified', function() {
    it('should show the save confirmation', function() {
      expect(workspaceElement.querySelector('.build-confirm')).not.toExist();

      // console.log('writing makefile');
      fs.writeFileSync(directory + 'Makefile', fs.readFileSync(goodMakefile));

      waitsForPromise(function() {
        // console.log('testing if makefile is open');
        return atom.workspace.open('Makefile');
      });

      runs(function() {
        var editor = atom.workspace.getActiveTextEditor();
        // console.log('adding text');
        editor.insertText('hello kansas');
        atom.commands.dispatch(workspaceElement, 'build:trigger');
      });

      waitsFor(function() {
        // console.log('checking for focused element');
        return workspaceElement.querySelector(':focus');
      });

      runs(function() {
        // console.log('verifying that success is the focuesed element');
        expect(workspaceElement.querySelector('.btn-success:focus')).toExist();
      });
    });

    it('should cancel the confirm window when pressing escape', function() {
      expect(workspaceElement.querySelector('.build-confirm')).not.toExist();

      fs.writeFileSync(directory + 'Makefile', fs.readFileSync(goodMakefile));

      waitsForPromise(function() {
        return atom.workspace.open('Makefile');
      });

      runs(function() {
        var editor = atom.workspace.getActiveTextEditor();
        editor.insertText('hello kansas');
        atom.commands.dispatch(workspaceElement, 'build:trigger');
      });

      waitsFor(function() {
        return workspaceElement.querySelector(':focus');
      });

      runs(function() {
        atom.commands.dispatch(workspaceElement, 'build:no-confirm');
        expect(workspaceElement.querySelector('.btn-success:focus')).not.toExist();
      });
    });

    it('should not confirm if a TextEditor edits an unsaved file', function() {
      expect(workspaceElement.querySelector('.build-confirm')).not.toExist();

      fs.writeFileSync(directory + 'Makefile', fs.readFileSync(goodMakefile));

      waitsForPromise(function() {
        return atom.workspace.open('Makefile');
      });

      waitsForPromise(function() {
        return atom.workspace.open();
      });

      runs(function() {
        var editor = _.find(atom.workspace.getTextEditors(), function(textEditor) {
          return ('untitled' === textEditor.getTitle());
        });
        editor.insertText('Just some temporary place to write stuff');
        atom.commands.dispatch(workspaceElement, 'build:trigger');
      });

      waitsFor(function() {
        return workspaceElement.querySelector('.build .title').classList.contains('success');
      });

      runs(function() {
        expect(workspaceElement.querySelector('.build')).toExist();
        expect(workspaceElement.querySelector('.build .output').textContent).toMatch(/Surprising is the passing of time\nbut not so, as the time of passing/);
      });
    });

    it('should save and build when selecting save and build', function() {
      expect(workspaceElement.querySelector('.build-confirm')).not.toExist();

      fs.writeFileSync(directory + 'Makefile', fs.readFileSync(goodMakefile));

      waitsForPromise(function() {
        return atom.workspace.open('Makefile');
      });

      runs(function() {
        var editor = atom.workspace.getActiveTextEditor();
        editor.insertText('dummy:\n\techo kansas\n');
        atom.commands.dispatch(workspaceElement, 'build:trigger');
      });

      waitsFor(function() {
        return workspaceElement.querySelector(':focus');
      });

      runs(function() {
        workspaceElement.querySelector(':focus').click();
      });

      waitsFor(function() {
        return workspaceElement.querySelector('.build .title').classList.contains('success');
      });

      runs(function() {
        var editor = atom.workspace.getActiveTextEditor();
        expect(workspaceElement.querySelector('.build')).toExist();
        expect(workspaceElement.querySelector('.build .output').innerHTML).toMatch(/kansas/);
        expect(!editor.isModified());
      });
    });

    it('should build but not save when opting so', function() {
      expect(workspaceElement.querySelector('.build-confirm')).not.toExist();

      fs.writeFileSync(directory + 'Makefile', fs.readFileSync(goodMakefile));

      waitsForPromise(function() {
        return atom.workspace.open('Makefile');
      });

      runs(function() {
        var editor = atom.workspace.getActiveTextEditor();
        editor.insertText('dummy:\n\techo kansas\n');
        atom.commands.dispatch(workspaceElement, 'build:trigger');
      });

      waitsFor(function() {
        return workspaceElement.querySelector(':focus');
      });

      runs(function() {
        workspaceElement.querySelector('button[click="confirmWithoutSave"]').click();
      });

      waitsFor(function() {
        return workspaceElement.querySelector('.build .title').classList.contains('success');
      });

      runs(function() {
        var editor = atom.workspace.getActiveTextEditor();
        expect(workspaceElement.querySelector('.build')).toExist();
        expect(workspaceElement.querySelector('.build .output').innerHTML).not.toMatch(/kansas/);
        expect(editor.isModified());
      });
    });

    it('should do nothing when cancelling', function() {
      expect(workspaceElement.querySelector('.build-confirm')).not.toExist();

      fs.writeFileSync(directory + 'Makefile', fs.readFileSync(goodMakefile));

      waitsForPromise(function() {
        return atom.workspace.open('Makefile');
      });

      runs(function() {
        var editor = atom.workspace.getActiveTextEditor();
        editor.insertText('dummy:\n\techo kansas\n');
        atom.commands.dispatch(workspaceElement, 'build:trigger');
      });

      waitsFor(function() {
        return workspaceElement.querySelector(':focus');
      });

      runs(function() {
        workspaceElement.querySelector('button[click="cancel"]').click();
      });

      waits(2);

      runs(function() {
        var editor = atom.workspace.getActiveTextEditor();
        expect(workspaceElement.querySelector('.build')).not.toExist();
        expect(editor.isModified());
      });
    });
  });

});